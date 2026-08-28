"use client";

import * as React from "react";
import { CheckCircle2, Pencil, Plus, Save, Trash2, XCircle } from "lucide-react";
import SmartImportPanel from "./smart-import-panel";

const TYPES = [
  ["mcq_single","Multiple Choice (Single Answer)"],
  ["mcq_multiple","Multiple Choice (Multiple Answer)"],
  ["true_false","True / False"],
  ["statement_based","Statement – Reason"],
  ["assertion_reason","Assertion – Reason"],
  ["match_following","Match the Following"],
  ["fill_blank","Fill in the Blanks"],
  ["numeric_answer","Numeric Answer"],
  ["paragraph_based","Paragraph Based"],
];

function blankQuestion() {
  return {
    id:null, question_type:"mcq_single", question_text:"", paragraph_text:"",
    marks:2, negative_marks:.66, explanation:"", options:["","","",""], correct:[0],
    answer_text:"", answer_numeric:"", answer_tolerance:0,
    verification_status:"verified", exam:"", subject:"", topic:"", difficulty:"medium"
  };
}

export default function LmsTestBuilder({testId}:{testId:string}) {
  const initiallyNew = testId === "new";
  const [id,setId] = React.useState(testId);
  const [form,setForm] = React.useState<any>({
    title:"", exam_category:"UPSC CSE Prelims", test_type:"full_length", description:"",
    subject:"", total_marks:200, duration_minutes:120, negative_marking:.66, passing_marks:33,
    language:"English", show_answers_after_submit:true, show_solutions:true, status:"draft"
  });
  const [q,setQ] = React.useState<any>(blankQuestion());
  const [questions,setQuestions] = React.useState<any[]>([]);
  const [saving,setSaving] = React.useState(false);
  const isNew = id === "new";

  const loadQuestions = (tid:string) =>
    fetch(`/api/admin/mock-tests/${tid}/questions`, { cache:"no-store" })
      .then(r=>r.json()).then(d=>setQuestions(d.questions??[]));

  React.useEffect(()=>{
    if(initiallyNew) return;
    fetch(`/api/admin/mock-tests/${testId}`, { cache:"no-store" }).then(r=>r.json()).then(d=>{
      if(d.test) setForm((f:any)=>({...f,...d.test}));
    });
    loadQuestions(testId);
  },[testId,initiallyNew]);

  const set=(k:string,v:any)=>setForm((f:any)=>({...f,[k]:v}));

  const saveTest=async()=>{
    setSaving(true);
    try {
      if(isNew) {
        const r=await fetch("/api/admin/mock-tests",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(form)});
        const d=await r.json();
        if(!r.ok) throw new Error(d.error||"Unable to create test.");
        setId(d.test.id); setForm((f:any)=>({...f,...d.test}));
        window.history.replaceState(null,"",`/admin/mock-test/tests/${d.test.id}`);
        return d.test.id as string;
      }
      const r=await fetch(`/api/admin/mock-tests/${id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(form)});
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||"Unable to save test.");
      setForm((f:any)=>({...f,...d.test}));
      return id;
    } catch(e:any) { alert(e.message); return null; }
    finally { setSaving(false); }
  };

  const ensureTest=async()=>isNew?await saveTest():id;
  const formOptions=()=>q.options.map((text:string,i:number)=>({
    option_key:String.fromCharCode(65+i), option_text:text, is_correct:q.correct.includes(i)
  })).filter((o:any)=>o.option_text.trim());

  const saveQuestion=async()=>{
    const tid=await ensureTest(); if(!tid) return;
    if(!q.question_text.trim()) return alert("Enter the question text.");

    const editing=Boolean(q.id);
    const r=await fetch(editing?`/api/admin/mock-questions/${q.id}`:`/api/admin/mock-tests/${tid}/questions`,{
      method:editing?"PATCH":"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({...q,options:formOptions()})
    });
    const d=await r.json();
    if(!r.ok) return alert(d.error||"Unable to save question.");
    setQ(blankQuestion()); await loadQuestions(tid);
  };

  const editQuestion=(item:any)=>{
    const opts=[...(item.options??[])].sort((a:any,b:any)=>Number(a.sort_order)-Number(b.sort_order));
    const optionTexts=Array.from({length:Math.max(4,opts.length)},(_,i)=>opts[i]?.option_text??"");
    const correct=opts.map((o:any,i:number)=>o.is_correct?i:-1).filter((i:number)=>i>=0);
    setQ({...blankQuestion(),...item,options:optionTexts,correct:correct.length?correct:[0],answer_text:item.answer_text??"",answer_numeric:item.answer_numeric??"",answer_tolerance:item.answer_tolerance??0,paragraph_text:item.paragraph_text??""});
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const deleteQuestion=async(item:any)=>{
    if(!confirm("Delete this question from the test and question bank?")) return;
    const r=await fetch(`/api/admin/mock-questions/${item.id}`,{method:"DELETE"});
    const d=await r.json();
    if(!r.ok) return alert(d.error||"Unable to delete.");
    if(q.id===item.id) setQ(blankQuestion());
    await loadQuestions(id);
  };

  const publish=async()=>{
    const tid=await ensureTest(); if(!tid) return;
    const r=await fetch(`/api/admin/mock-tests/${tid}`,{
      method:"PATCH", headers:{"content-type":"application/json"}, body:JSON.stringify({...form,status:"published"})
    });
    const d=await r.json();
    if(!r.ok) return alert(d.error||"Unable to publish.");
    setForm((f:any)=>({...f,status:"published"}));
    alert("Test published successfully.");
  };

  const choice=!["fill_blank","numeric_answer"].includes(q.question_type);
  const multiple=q.question_type==="mcq_multiple";
  const unverified=questions.filter(x=>x.verification_status!=="verified").length;

  return (
    <div className="lms-mock-body">
      <div className="lms-mock-heading">
        <div>
          <div className="lms-mock-eyebrow">ADMIN · CREATE MOCK TEST</div>
          <h1>{isNew ? "Create Mock Test" : form.title || "Edit Mock Test"}</h1>
          <p>Test settings, manual MCQ creation and Smart Import are all managed from this LMS page.</p>
        </div>
        <div className="lms-heading-actions">
          <button className="lms-secondary" disabled={saving} onClick={saveTest}><Save className="h-4 w-4"/>{saving?"Saving…":"Save Draft"}</button>
          <button className="lms-primary" disabled={saving||!questions.length} onClick={publish}>Publish Test</button>
        </div>
      </div>

      <div className="lms-builder-grid">
        <div className="lms-builder-left">
          <section className="lms-panel">
            <div className="lms-panel-head"><div><h2>Test Information</h2><p>Core details shown to students.</p></div></div>
            <div className="lms-form-grid">
              <label className="lms-field full"><span>Test Title *</span><input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="UPSC CSE Prelims – Full Length Test 01"/></label>
              <label className="lms-field"><span>Exam Category *</span><select value={form.exam_category} onChange={e=>set("exam_category",e.target.value)}><option>UPSC CSE Prelims</option><option>UPSC</option><option>State PCS</option><option>SSC</option><option>Banking</option></select></label>
              <label className="lms-field"><span>Test Type *</span><select value={form.test_type} onChange={e=>set("test_type",e.target.value)}><option value="full_length">Full Length Test</option><option value="subject">Subject Wise</option><option value="daily_quiz">Daily Quiz</option><option value="pyq">PYQ Test</option></select></label>
              <label className="lms-field"><span>Subject</span><input value={form.subject??""} onChange={e=>set("subject",e.target.value)}/></label>
              <label className="lms-field"><span>Language</span><select value={form.language} onChange={e=>set("language",e.target.value)}><option>English</option><option>Hindi</option></select></label>
              <label className="lms-field full"><span>Description</span><textarea value={form.description??""} onChange={e=>set("description",e.target.value)} /></label>
            </div>
          </section>

          <section className="lms-panel">
            <div className="lms-panel-head"><div><h2>Test Settings</h2><p>Scoring, duration and answer visibility.</p></div></div>
            <div className="lms-form-grid">
              <label className="lms-field"><span>Total Questions</span><input value={questions.length} readOnly/></label>
              <label className="lms-field"><span>Total Marks *</span><input type="number" value={form.total_marks} onChange={e=>set("total_marks",Number(e.target.value))}/></label>
              <label className="lms-field"><span>Duration (Minutes) *</span><input type="number" value={form.duration_minutes} onChange={e=>set("duration_minutes",Number(e.target.value))}/></label>
              <label className="lms-field"><span>Default Negative Marking</span><input type="number" step=".01" value={form.negative_marking} onChange={e=>set("negative_marking",Number(e.target.value))}/></label>
              <label className="lms-field"><span>Passing Marks (%)</span><input type="number" value={form.passing_marks} onChange={e=>set("passing_marks",Number(e.target.value))}/></label>
              <label className="lms-field"><span>Status</span><input value={form.status} readOnly/></label>
            </div>
            <div className="lms-toggle-row">
              <label><span>Show Answers After Submit</span><input type="checkbox" checked={!!form.show_answers_after_submit} onChange={e=>set("show_answers_after_submit",e.target.checked)}/></label>
              <label><span>Show Solutions</span><input type="checkbox" checked={!!form.show_solutions} onChange={e=>set("show_solutions",e.target.checked)}/></label>
            </div>
            <div className="lms-inline-status"><span>{questions.length} questions</span><span className={unverified?"warn":"ok"}>{unverified?`${unverified} need verification`:"All questions verified"}</span><span>{form.status}</span></div>
          </section>
        </div>

        <section className="lms-panel lms-question-editor">
          <div className="lms-panel-head"><div><h2>{q.id?"Edit Question":"Add Question Manually"}</h2><p>Create MCQ and other supported question types.</p></div></div>
          <div className="lms-form-grid">
            <label className="lms-field full"><span>Question Type</span><select value={q.question_type} onChange={e=>setQ((x:any)=>({...x,question_type:e.target.value}))}>{TYPES.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
            {q.question_type==="paragraph_based"&&<label className="lms-field full"><span>Passage / Paragraph</span><textarea value={q.paragraph_text} onChange={e=>setQ((x:any)=>({...x,paragraph_text:e.target.value}))}/></label>}
            <label className="lms-field full"><span>Question *</span><textarea value={q.question_text} onChange={e=>setQ((x:any)=>({...x,question_text:e.target.value}))} placeholder="Enter the question text"/></label>
            <label className="lms-field"><span>Marks</span><input type="number" value={q.marks} onChange={e=>setQ((x:any)=>({...x,marks:Number(e.target.value)}))}/></label>
            <label className="lms-field"><span>Negative Marks</span><input type="number" step=".01" value={q.negative_marks} onChange={e=>setQ((x:any)=>({...x,negative_marks:Number(e.target.value)}))}/></label>
          </div>

          {choice&&<div className="lms-options">{q.options.map((o:string,i:number)=><div key={i}>
            <span>{String.fromCharCode(65+i)}</span>
            <input value={o} placeholder={`Option ${String.fromCharCode(65+i)}`} onChange={e=>setQ((x:any)=>({...x,options:x.options.map((a:string,j:number)=>j===i?e.target.value:a)}))}/>
            <input type={multiple?"checkbox":"radio"} name="correct" checked={q.correct.includes(i)} onChange={()=>setQ((x:any)=>({...x,correct:multiple?(x.correct.includes(i)?x.correct.filter((n:number)=>n!==i):[...x.correct,i]):[i]}))}/>
          </div>)}</div>}

          {q.question_type==="fill_blank"&&<label className="lms-field"><span>Correct Answer (use | for alternatives)</span><input value={q.answer_text} onChange={e=>setQ((x:any)=>({...x,answer_text:e.target.value}))}/></label>}
          {q.question_type==="numeric_answer"&&<div className="lms-form-grid"><label className="lms-field"><span>Correct Numeric Answer</span><input type="number" step="any" value={q.answer_numeric} onChange={e=>setQ((x:any)=>({...x,answer_numeric:e.target.value}))}/></label><label className="lms-field"><span>Tolerance ±</span><input type="number" step="any" value={q.answer_tolerance} onChange={e=>setQ((x:any)=>({...x,answer_tolerance:Number(e.target.value)}))}/></label></div>}

          <label className="lms-field"><span>Explanation / Solution</span><textarea value={q.explanation} onChange={e=>setQ((x:any)=>({...x,explanation:e.target.value}))}/></label>
          <div className="lms-form-grid">
            <label className="lms-field"><span>Verification</span><select value={q.verification_status} onChange={e=>setQ((x:any)=>({...x,verification_status:e.target.value}))}><option value="verified">Verified</option><option value="needs_verification">Needs Verification</option></select></label>
            <label className="lms-field"><span>Difficulty</span><select value={q.difficulty} onChange={e=>setQ((x:any)=>({...x,difficulty:e.target.value}))}><option>easy</option><option>medium</option><option>hard</option></select></label>
          </div>
          <div className="lms-heading-actions"><button className="lms-primary" onClick={saveQuestion}>{q.id?<Save className="h-4 w-4"/>:<Plus className="h-4 w-4"/>}{q.id?"Save Question":"Add Question"}</button>{q.id&&<button className="lms-secondary" onClick={()=>setQ(blankQuestion())}><XCircle className="h-4 w-4"/>Cancel Edit</button>}</div>
        </section>
      </div>

      {!isNew ? <SmartImportPanel testId={id} defaults={{exam:form.exam_category,subject:form.subject,language:form.language,marks:2,negativeMarks:form.negative_marking}} onImported={()=>loadQuestions(id)}/> :
        <section className="lms-panel lms-save-first"><b>Save this new test first to enable Smart Import.</b><span>After saving, upload PDF, DOCX, TXT, MD, CSV, or paste source content.</span></section>}

      <section className="lms-panel">
        <div className="lms-panel-head"><div><h2>Questions in this Test</h2><p>Imported and manually created questions appear here.</p></div><strong>{questions.length}</strong></div>
        {questions.length===0 ? <div className="lms-empty">No questions yet. Add one manually or use Smart Import.</div> :
        <div className="lms-question-list">{questions.map((item:any,i:number)=><article className={item.verification_status!=="verified"?"needs-review":""} key={item.id}>
          <div><b>Q{i+1}</b><span>{item.question_text}</span><small>{item.question_type} · {item.verification_status}{item.source_pdf?` · ${item.source_pdf}`:""}</small></div>
          <div className="lms-question-actions">{item.verification_status==="verified"?<CheckCircle2/>:<XCircle/>}<button onClick={()=>editQuestion(item)}><Pencil/></button><button onClick={()=>deleteQuestion(item)}><Trash2/></button></div>
        </article>)}</div>}
      </section>
    </div>
  );
}
