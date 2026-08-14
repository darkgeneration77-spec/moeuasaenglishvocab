export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
      'Content-Type': 'application/json; charset=utf-8'
    };
    if (request.method === 'OPTIONS') return new Response(null,{headers:cors});
    const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
    const teacherAllowed=()=>url.searchParams.get('key')==='008';
    const makeCode=(id)=>'UASA-'+String(id).replace(/-/g,'').slice(0,6).toUpperCase();
    try {
      if (url.pathname === '/api/health') return json({ok:true,system:'MOE UASA English Progress V2.3'});

      if (url.pathname === '/api/student/register' && request.method === 'POST') {
        const body=await request.json(),code=String(body.student_code||'').trim().toUpperCase(),name=String(body.name||'').trim(),className=String(body.class_name||'').trim();
        if(code){
          const s=await env.DB.prepare('SELECT id,name,class_name,student_code FROM students WHERE UPPER(TRIM(student_code))=? LIMIT 1').bind(code).first();
          if(!s) return json({error:'Student code not found'},404);
          await env.DB.prepare('UPDATE students SET last_seen=CURRENT_TIMESTAMP WHERE id=?').bind(s.id).run();
          await env.DB.prepare(`INSERT INTO student_progress(student_id,updated_at) VALUES(?,CURRENT_TIMESTAMP) ON CONFLICT(student_id) DO UPDATE SET updated_at=CURRENT_TIMESTAMP`).bind(s.id).run();
          return json({ok:true,id:s.id,name:s.name,class_name:s.class_name,student_code:s.student_code,restored:true,login_method:'code'});
        }
        if(!name) return json({error:'Name required'},400);
        if(!className) return json({error:'Class required'},400);
        const s=await env.DB.prepare(`SELECT id,name,class_name,student_code FROM students WHERE LOWER(TRIM(name))=LOWER(?) AND LOWER(TRIM(class_name))=LOWER(?) ORDER BY created_at ASC LIMIT 1`).bind(name,className).first();
        if(s){
          let studentCode=String(s.student_code||'').trim();
          if(!studentCode){studentCode=makeCode(s.id);await env.DB.prepare('UPDATE students SET student_code=?,last_seen=CURRENT_TIMESTAMP WHERE id=?').bind(studentCode,s.id).run();}
          else await env.DB.prepare('UPDATE students SET last_seen=CURRENT_TIMESTAMP WHERE id=?').bind(s.id).run();
          await env.DB.prepare(`INSERT INTO student_progress(student_id,updated_at) VALUES(?,CURRENT_TIMESTAMP) ON CONFLICT(student_id) DO UPDATE SET updated_at=CURRENT_TIMESTAMP`).bind(s.id).run();
          return json({ok:true,id:s.id,name:s.name,class_name:s.class_name,student_code:studentCode,restored:true,login_method:'name_class'});
        }
        const id=String(body.id||crypto.randomUUID()),studentCode=makeCode(id);
        await env.DB.prepare(`INSERT INTO students(id,name,class_name,student_code,last_seen) VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET name=excluded.name,class_name=excluded.class_name,student_code=CASE WHEN students.student_code='' THEN excluded.student_code ELSE students.student_code END,last_seen=CURRENT_TIMESTAMP`).bind(id,name,className,studentCode).run();
        await env.DB.prepare(`INSERT INTO student_progress(student_id,updated_at) VALUES(?,CURRENT_TIMESTAMP) ON CONFLICT(student_id) DO UPDATE SET updated_at=CURRENT_TIMESTAMP`).bind(id).run();
        return json({ok:true,id,name,class_name:className,student_code:studentCode,restored:false,login_method:'new'});
      }

      if (url.pathname === '/api/student/lookup' && request.method === 'GET') {
        const code=String(url.searchParams.get('student_code')||'').trim().toUpperCase();
        if(!code) return json({error:'student_code required'},400);
        const student=await env.DB.prepare('SELECT id,name,class_name,student_code,last_seen FROM students WHERE UPPER(TRIM(student_code))=? LIMIT 1').bind(code).first();
        return student?json({student}):json({error:'Student code not found'},404);
      }

      if (url.pathname === '/api/event' && request.method === 'POST') {
        const b=await request.json();
        if(!b.student_id||!b.book_no||!b.event_type) return json({error:'Missing required fields'},400);
        await env.DB.prepare('UPDATE students SET last_seen=CURRENT_TIMESTAMP WHERE id=?').bind(String(b.student_id)).run();
        await env.DB.prepare(`INSERT INTO learning_events(student_id,book_no,book_title,event_type,question_key,question_text,answer_text,correct_answer,is_correct,recovered,quiz_mode) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(String(b.student_id),Number(b.book_no),String(b.book_title||''),String(b.event_type),String(b.question_key||''),String(b.question_text||''),String(b.answer_text||''),String(b.correct_answer||''),b.is_correct===true?1:b.is_correct===false?0:null,b.recovered===true?1:0,String(b.quiz_mode||'')).run();
        return json({ok:true});
      }

      if (url.pathname === '/api/progress/save' && request.method === 'POST') {
        const b=await request.json(),studentId=String(b.student_id||'');
        if(!studentId) return json({error:'student_id required'},400);
        const xp=Math.max(0,Number(b.total_xp||0)),currentStreak=Math.max(0,Number(b.current_streak||0)),bestStreak=Math.max(0,Number(b.best_streak||0)),booksStarted=Math.max(0,Number(b.books_started||0)),booksMastered=Math.max(0,Number(b.books_mastered||0));
        await env.DB.prepare(`INSERT INTO student_progress(student_id,total_xp,current_streak,best_streak,books_started,books_mastered,updated_at) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(student_id) DO UPDATE SET total_xp=MAX(student_progress.total_xp,excluded.total_xp),current_streak=excluded.current_streak,best_streak=MAX(student_progress.best_streak,excluded.best_streak),books_started=MAX(student_progress.books_started,excluded.books_started),books_mastered=MAX(student_progress.books_mastered,excluded.books_mastered),updated_at=CURRENT_TIMESTAMP`).bind(studentId,xp,currentStreak,bestStreak,booksStarted,booksMastered).run();
        if(b.book_no&&b.level_no){
          const bookNo=Number(b.book_no),levelNo=Number(b.level_no),mastery=Math.max(0,Math.min(100,Number(b.mastery||0))),attempts=Math.max(0,Number(b.attempts||0)),correct=Math.max(0,Number(b.correct||0)),unlocked=b.unlocked?1:0,mastered=b.mastered?1:(mastery>=80?1:0);
          await env.DB.prepare(`INSERT INTO level_mastery(student_id,book_no,level_no,mastery,attempts,correct,unlocked,mastered,updated_at) VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(student_id,book_no,level_no) DO UPDATE SET mastery=MAX(level_mastery.mastery,excluded.mastery),attempts=MAX(level_mastery.attempts,excluded.attempts),correct=MAX(level_mastery.correct,excluded.correct),unlocked=MAX(level_mastery.unlocked,excluded.unlocked),mastered=MAX(level_mastery.mastered,excluded.mastered),updated_at=CURRENT_TIMESTAMP`).bind(studentId,bookNo,levelNo,mastery,attempts,correct,unlocked,mastered).run();
          if(mastered&&levelNo<4) await env.DB.prepare(`INSERT INTO level_mastery(student_id,book_no,level_no,unlocked,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(student_id,book_no,level_no) DO UPDATE SET unlocked=1,updated_at=CURRENT_TIMESTAMP`).bind(studentId,bookNo,levelNo+1,1).run();
        }
        return json({ok:true});
      }

      if (url.pathname === '/api/progress/get' && request.method === 'GET') {
        const id=url.searchParams.get('student_id'); if(!id) return json({error:'student_id required'},400);
        const progress=await env.DB.prepare('SELECT * FROM student_progress WHERE student_id=?').bind(id).first();
        const levels=await env.DB.prepare('SELECT * FROM level_mastery WHERE student_id=? ORDER BY book_no,level_no').bind(id).all();
        const bosses=await env.DB.prepare('SELECT * FROM boss_results WHERE student_id=? ORDER BY books_from').bind(id).all();
        const achievements=await env.DB.prepare('SELECT * FROM achievements WHERE student_id=? ORDER BY unlocked_at').bind(id).all();
        return json({progress:progress||null,levels:levels.results||[],bosses:bosses.results||[],achievements:achievements.results||[]});
      }

      if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
        const studentId=String(url.searchParams.get('student_id')||'');
        if(!studentId) return json({error:'student_id required'},400);
        const rows=await env.DB.prepare(`SELECT s.id,s.name,s.class_name,s.student_code,COALESCE(p.total_xp,0) total_xp,COALESCE(p.best_streak,0) best_streak,COALESCE(p.books_mastered,0) books_mastered FROM students s LEFT JOIN student_progress p ON p.student_id=s.id ORDER BY total_xp DESC,best_streak DESC,s.name COLLATE NOCASE ASC`).all();
        const list=(rows.results||[]).map((x,i)=>({...x,rank:i+1,total_xp:Number(x.total_xp||0),best_streak:Number(x.best_streak||0),books_mastered:Number(x.books_mastered||0)}));
        const idx=list.findIndex(x=>String(x.id)===studentId);
        if(idx<0) return json({error:'Student not found'},404);
        const me=list[idx];
        const start=Math.max(0,idx-2),end=Math.min(list.length,idx+3);
        const nearby=list.slice(start,end);
        const above=idx>0?list[idx-1]:null;
        const below=idx<list.length-1?list[idx+1]:null;
        let rival=null;
        if(above&&below){const da=Math.abs(Number(above.total_xp)-Number(me.total_xp)),db=Math.abs(Number(below.total_xp)-Number(me.total_xp));rival=da<=db?above:below}else rival=above||below;
        return json({leaderboard:nearby,my_rank:me.rank,me,rival,total_students:list.length});
      }

      if (url.pathname === '/api/boss/save' && request.method === 'POST') {
        const b=await request.json(),studentId=String(b.student_id||''),group=String(b.boss_group||'');
        if(!studentId||!group) return json({error:'student_id and boss_group required'},400);
        const from=Number(b.books_from||0),to=Number(b.books_to||0),score=Math.max(0,Number(b.score||0)),total=Math.max(0,Number(b.total||0)),pct=total?Math.round(score/total*100):Math.max(0,Number(b.percentage||0)),passed=pct>=80?1:0;
        await env.DB.prepare(`INSERT INTO boss_results(student_id,boss_group,books_from,books_to,score,total,percentage,passed,attempts,best_percentage,updated_at) VALUES(?,?,?,?,?,?,?,?,1,?,CURRENT_TIMESTAMP) ON CONFLICT(student_id,boss_group) DO UPDATE SET score=excluded.score,total=excluded.total,percentage=excluded.percentage,passed=MAX(boss_results.passed,excluded.passed),attempts=boss_results.attempts+1,best_percentage=MAX(boss_results.best_percentage,excluded.percentage),updated_at=CURRENT_TIMESTAMP`).bind(studentId,group,from,to,score,total,pct,passed,pct).run();
        return json({ok:true,percentage:pct,passed:!!passed});
      }

      if (url.pathname === '/api/achievement/unlock' && request.method === 'POST') {
        const b=await request.json(),studentId=String(b.student_id||''),key=String(b.achievement_key||''),name=String(b.achievement_name||key);
        if(!studentId||!key) return json({error:'student_id and achievement_key required'},400);
        await env.DB.prepare(`INSERT INTO achievements(student_id,achievement_key,achievement_name,unlocked,unlocked_at) VALUES(?,?,?,1,CURRENT_TIMESTAMP) ON CONFLICT(student_id,achievement_key) DO UPDATE SET achievement_name=excluded.achievement_name,unlocked=1`).bind(studentId,key,name).run();
        return json({ok:true});
      }

      if (url.pathname === '/api/assignments/student' && request.method === 'GET') {
        const id=url.searchParams.get('student_id'); if(!id) return json({error:'student_id required'},400);
        const rows=await env.DB.prepare(`SELECT * FROM assignments WHERE student_id=? ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END,id DESC`).bind(id).all();
        return json({assignments:rows.results||[]});
      }

      if (url.pathname === '/api/assignments/complete' && request.method === 'POST') {
        const b=await request.json(),id=Number(b.assignment_id||0),studentId=String(b.student_id||'');
        if(!id||!studentId) return json({error:'assignment_id and student_id required'},400);
        const row=await env.DB.prepare('SELECT id FROM assignments WHERE id=? AND student_id=?').bind(id,studentId).first();
        if(!row) return json({error:'Assignment not found'},404);
        await env.DB.prepare(`UPDATE assignments SET status='completed',completed_at=CURRENT_TIMESTAMP WHERE id=? AND student_id=?`).bind(id,studentId).run();
        return json({ok:true});
      }

      if (url.pathname === '/api/teacher/assignments/create' && request.method === 'POST') {
        if(!teacherAllowed()) return json({error:'Unauthorized'},401);
        const b=await request.json(),studentId=String(b.student_id||''),taskType=String(b.task_type||'custom'),title=String(b.title||'').trim();
        if(!studentId||!title) return json({error:'student_id and title required'},400);
        const s=await env.DB.prepare('SELECT id FROM students WHERE id=?').bind(studentId).first(); if(!s) return json({error:'Student not found'},404);
        const r=await env.DB.prepare(`INSERT INTO assignments(student_id,assigned_by,task_type,book_no,level_no,title,instruction,status,created_at) VALUES(?,'teacher',?,?,?,?,?,'pending',CURRENT_TIMESTAMP)`).bind(studentId,taskType,Number(b.book_no||0),Number(b.level_no||0),title,String(b.instruction||'')).run();
        return json({ok:true,id:r.meta?.last_row_id||null});
      }

      if (url.pathname === '/api/teacher/assignments' && request.method === 'GET') {
        if(!teacherAllowed()) return json({error:'Unauthorized'},401);
        const rows=await env.DB.prepare(`SELECT a.*,s.name,s.class_name,s.student_code FROM assignments a JOIN students s ON s.id=a.student_id ORDER BY a.id DESC LIMIT 500`).all();
        return json({assignments:rows.results||[]});
      }

      if (url.pathname === '/api/student/summary' && request.method === 'GET') {
        const id=url.searchParams.get('student_id'); if(!id) return json({error:'student_id required'},400);
        const student=await env.DB.prepare('SELECT id,name,class_name,student_code,created_at,last_seen FROM students WHERE id=?').bind(id).first();
        const books=await env.DB.prepare(`SELECT book_no,MAX(book_title) book_title,SUM(CASE WHEN event_type='answer' THEN 1 ELSE 0 END) attempts,SUM(CASE WHEN event_type='answer' AND is_correct=1 THEN 1 ELSE 0 END) correct,SUM(CASE WHEN event_type='answer' AND is_correct=0 THEN 1 ELSE 0 END) wrong,SUM(CASE WHEN event_type='quiz_complete' THEN 1 ELSE 0 END) quizzes_completed,MAX(created_at) last_activity FROM learning_events WHERE student_id=? GROUP BY book_no ORDER BY book_no`).bind(id).all();
        const recent=await env.DB.prepare(`SELECT id,book_no,book_title,event_type,question_key,question_text,answer_text,correct_answer,is_correct,recovered,quiz_mode,created_at FROM learning_events WHERE student_id=? ORDER BY id DESC LIMIT 300`).bind(id).all();
        const progress=await env.DB.prepare('SELECT * FROM student_progress WHERE student_id=?').bind(id).first();
        const levels=await env.DB.prepare('SELECT * FROM level_mastery WHERE student_id=? ORDER BY book_no,level_no').bind(id).all();
        const bosses=await env.DB.prepare('SELECT * FROM boss_results WHERE student_id=? ORDER BY books_from').bind(id).all();
        const achievements=await env.DB.prepare('SELECT * FROM achievements WHERE student_id=? ORDER BY unlocked_at').bind(id).all();
        const assignments=await env.DB.prepare(`SELECT * FROM assignments WHERE student_id=? ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END,id DESC LIMIT 50`).bind(id).all();
        return json({student,books:books.results||[],recent:recent.results||[],progress:progress||null,levels:levels.results||[],bosses:bosses.results||[],achievements:achievements.results||[],assignments:assignments.results||[]});
      }

      if (url.pathname === '/api/teacher/students' && request.method === 'GET') {
        if(!teacherAllowed()) return json({error:'Unauthorized'},401);
        const rows=await env.DB.prepare(`SELECT s.id,s.name,s.class_name,s.student_code,s.last_seen,COUNT(CASE WHEN e.event_type='answer' THEN 1 END) attempts,SUM(CASE WHEN e.event_type='answer' AND e.is_correct=1 THEN 1 ELSE 0 END) correct,SUM(CASE WHEN e.event_type='answer' AND e.is_correct=0 THEN 1 ELSE 0 END) wrong,COUNT(DISTINCT e.book_no) books_started,MAX(e.created_at) last_activity,COALESCE(p.total_xp,0) total_xp,COALESCE(p.best_streak,0) best_streak,COALESCE(p.books_mastered,0) books_mastered,(SELECT COUNT(*) FROM assignments a WHERE a.student_id=s.id AND a.status='pending') pending_assignments FROM students s LEFT JOIN learning_events e ON e.student_id=s.id LEFT JOIN student_progress p ON p.student_id=s.id GROUP BY s.id ORDER BY COALESCE(last_activity,s.last_seen) DESC`).all();
        return json({students:rows.results||[]});
      }

      if (url.pathname === '/api/teacher/student' && request.method === 'GET') {
        if(!teacherAllowed()) return json({error:'Unauthorized'},401);
        const id=url.searchParams.get('student_id'); if(!id) return json({error:'student_id required'},400);
        const student=await env.DB.prepare('SELECT id,name,class_name,student_code,created_at,last_seen FROM students WHERE id=?').bind(id).first();
        const books=await env.DB.prepare(`SELECT book_no,MAX(book_title) book_title,SUM(CASE WHEN event_type='answer' THEN 1 ELSE 0 END) attempts,SUM(CASE WHEN event_type='answer' AND is_correct=1 THEN 1 ELSE 0 END) correct,SUM(CASE WHEN event_type='answer' AND is_correct=0 THEN 1 ELSE 0 END) wrong,SUM(CASE WHEN event_type='quiz_complete' THEN 1 ELSE 0 END) quizzes_completed,MAX(created_at) last_activity FROM learning_events WHERE student_id=? GROUP BY book_no ORDER BY book_no`).bind(id).all();
        const wrongItems=await env.DB.prepare(`SELECT id,book_no,book_title,question_key,question_text,answer_text,correct_answer,recovered,quiz_mode,created_at FROM learning_events WHERE student_id=? AND event_type='answer' AND is_correct=0 ORDER BY id DESC LIMIT 500`).bind(id).all();
        const progress=await env.DB.prepare('SELECT * FROM student_progress WHERE student_id=?').bind(id).first();
        const levels=await env.DB.prepare('SELECT * FROM level_mastery WHERE student_id=? ORDER BY book_no,level_no').bind(id).all();
        const bosses=await env.DB.prepare('SELECT * FROM boss_results WHERE student_id=? ORDER BY books_from').bind(id).all();
        const achievements=await env.DB.prepare('SELECT * FROM achievements WHERE student_id=? ORDER BY unlocked_at').bind(id).all();
        const assignments=await env.DB.prepare('SELECT * FROM assignments WHERE student_id=? ORDER BY id DESC').bind(id).all();
        return json({student,books:books.results||[],wrong_items:wrongItems.results||[],progress:progress||null,levels:levels.results||[],bosses:bosses.results||[],achievements:achievements.results||[],assignments:assignments.results||[]});
      }

      return json({error:'Not found'},404);
    } catch(err){return json({error:String(err&&err.message||err)},500)}
  }
};