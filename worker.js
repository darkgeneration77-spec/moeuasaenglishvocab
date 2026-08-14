export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Teacher-Key',
      'Vary': 'Origin',
      'Content-Type': 'application/json; charset=utf-8'
    };
    if (request.method === 'OPTIONS') return new Response(null,{headers:cors});
    const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
    try {
      if (url.pathname === '/api/health') return json({ok:true});

      if (url.pathname === '/api/student/register' && request.method === 'POST') {
        const body = await request.json();
        const name = String(body.name||'').trim();
        const className = String(body.class_name||'').trim();
        if(!name) return json({error:'Name required'},400);
        const id = String(body.id||crypto.randomUUID());
        await env.DB.prepare(`INSERT INTO students(id,name,class_name,last_seen) VALUES(?,?,?,CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET name=excluded.name,class_name=excluded.class_name,last_seen=CURRENT_TIMESTAMP`)
          .bind(id,name,className).run();
        return json({ok:true,id,name,class_name:className});
      }

      if (url.pathname === '/api/event' && request.method === 'POST') {
        const b = await request.json();
        if(!b.student_id || !b.book_no || !b.event_type) return json({error:'Missing required fields'},400);
        await env.DB.prepare('UPDATE students SET last_seen=CURRENT_TIMESTAMP WHERE id=?').bind(String(b.student_id)).run();
        await env.DB.prepare(`INSERT INTO learning_events(student_id,book_no,book_title,event_type,question_key,question_text,answer_text,is_correct,quiz_mode)
          VALUES(?,?,?,?,?,?,?,?,?)`)
          .bind(String(b.student_id),Number(b.book_no),String(b.book_title||''),String(b.event_type),String(b.question_key||''),String(b.question_text||''),String(b.answer_text||''),b.is_correct===true?1:b.is_correct===false?0:null,String(b.quiz_mode||''))
          .run();
        return json({ok:true});
      }

      if (url.pathname === '/api/student/summary' && request.method === 'GET') {
        const id = url.searchParams.get('student_id');
        if(!id) return json({error:'student_id required'},400);
        const student = await env.DB.prepare('SELECT * FROM students WHERE id=?').bind(id).first();
        const books = await env.DB.prepare(`SELECT book_no,MAX(book_title) book_title,
          SUM(CASE WHEN event_type='answer' THEN 1 ELSE 0 END) attempts,
          SUM(CASE WHEN event_type='answer' AND is_correct=1 THEN 1 ELSE 0 END) correct,
          SUM(CASE WHEN event_type='answer' AND is_correct=0 THEN 1 ELSE 0 END) wrong,
          SUM(CASE WHEN event_type='quiz_complete' THEN 1 ELSE 0 END) quizzes_completed,
          MAX(created_at) last_activity
          FROM learning_events WHERE student_id=? GROUP BY book_no ORDER BY book_no`).bind(id).all();
        const recent = await env.DB.prepare(`SELECT book_no,book_title,event_type,question_text,answer_text,is_correct,quiz_mode,created_at
          FROM learning_events WHERE student_id=? ORDER BY id DESC LIMIT 50`).bind(id).all();
        return json({student,books:books.results||[],recent:recent.results||[]});
      }

      if (url.pathname === '/api/teacher/students' && request.method === 'GET') {
        if(!env.TEACHER_KEY || request.headers.get('X-Teacher-Key') !== env.TEACHER_KEY) return json({error:'Unauthorized'},401);
        const rows = await env.DB.prepare(`SELECT s.id,s.name,s.class_name,s.last_seen,
          COUNT(CASE WHEN e.event_type='answer' THEN 1 END) attempts,
          SUM(CASE WHEN e.event_type='answer' AND e.is_correct=1 THEN 1 ELSE 0 END) correct,
          SUM(CASE WHEN e.event_type='answer' AND e.is_correct=0 THEN 1 ELSE 0 END) wrong,
          COUNT(DISTINCT e.book_no) books_started,
          MAX(e.created_at) last_activity
          FROM students s LEFT JOIN learning_events e ON e.student_id=s.id
          GROUP BY s.id ORDER BY COALESCE(last_activity,s.last_seen) DESC`).all();
        return json({students:rows.results||[]});
      }

      if (url.pathname === '/api/teacher/student' && request.method === 'GET') {
        if(!env.TEACHER_KEY || request.headers.get('X-Teacher-Key') !== env.TEACHER_KEY) return json({error:'Unauthorized'},401);
        const id = url.searchParams.get('student_id');
        if(!id) return json({error:'student_id required'},400);
        const student = await env.DB.prepare('SELECT * FROM students WHERE id=?').bind(id).first();
        const books = await env.DB.prepare(`SELECT book_no,MAX(book_title) book_title,
          SUM(CASE WHEN event_type='answer' THEN 1 ELSE 0 END) attempts,
          SUM(CASE WHEN event_type='answer' AND is_correct=1 THEN 1 ELSE 0 END) correct,
          SUM(CASE WHEN event_type='answer' AND is_correct=0 THEN 1 ELSE 0 END) wrong,
          SUM(CASE WHEN event_type='quiz_complete' THEN 1 ELSE 0 END) quizzes_completed,
          MAX(created_at) last_activity
          FROM learning_events WHERE student_id=? GROUP BY book_no ORDER BY book_no`).bind(id).all();
        const wrongItems = await env.DB.prepare(`SELECT book_no,book_title,question_text,answer_text,quiz_mode,created_at
          FROM learning_events WHERE student_id=? AND event_type='answer' AND is_correct=0 ORDER BY id DESC LIMIT 200`).bind(id).all();
        return json({student,books:books.results||[],wrong_items:wrongItems.results||[]});
      }

      return json({error:'Not found'},404);
    } catch (err) {
      return json({error:String(err && err.message || err)},500);
    }
  }
};
