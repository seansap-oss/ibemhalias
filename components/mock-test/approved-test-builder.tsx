"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { AdminMockShell, AdminBackTitle } from "./approved-shell";
import SmartImportPanel from "./smart-import-panel";

const TYPES=[
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

function blankQuestion(){
  return {
    id:null,question_type:"mcq_single",question_text:"",paragraph_text:"",
    marks:2,negative_marks:.66,explanation:"",options:["","","",""],correct:[0],
    answer_text:"",answer_numeric:"",answer_tolerance:0,
    verification_status:"verified",exam:"",subject:"",topic:"",difficulty:"medium"
  };
}

export default function ApprovedTestBuilder({testId}:{testId:string}){
  const initiallyNew=testId==="new";
  const [id,setId]=useState(testId);
  const [form,setForm]=useState<any>({
    title:"",exam_category:"UPSC CSE Prelims",test_type:"full_length",description:"",
    total_marks:200,duration_minutes:120,negative_marking:.66,passing_marks:33,
    language:"English",show_answers_after_submit:true,show_solutions:true,status:"draft",
    subject:""
  });
  const [q,setQ]=useState<any>(blankQuestion());
  const [questions,setQuestions]=useState<any[]>([]);
  const [saving,setSaving]=useState(false);

  const isNew=id==="new";

  const loadQuestions=(tid:string)=>fetch(`/api/admin/mock-tests/${tid}/questions`).then(r=>r.json()).then(d=>setQuestions(d.questions??[]));

  useEffect(()=>{
    if(initiallyNew)return;
    fetch(`/api/admin/mock-tests/${testId}`).then(r=>r.json()).then(d=>{if(d.test)setForm((f:any)=>({...f,...d.test}))});
    loadQuestions(testId);
  },[testId,initiallyNew]);

  const set=(k:string,v:any)=>setForm((f:any)=>({...f,[k]:v}));

  const saveTest=async()=>{
    setSaving(true);
    try{
      if(isNew){
        const r=await fetch("/api/admin/mock-tests",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(form)});
        const d=await r.json();
        if(!r.ok)throw new Error(d.error||"Unable to create test");
        setId(d.test.id);
        setForm((f:any)=>({...f,...d.test}));
        window.history.replaceState(null,"",`/admin/mock-test/tests/${d.test.id}`);
        return d.test.id as string;
      }
      const r=await fetch(`/api/admin/mock-tests/${id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(form)});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Unable to save test");
      setForm((f:any)=>({...f,...d.test}));
      return id;
    }catch(e:any){alert(e.message);return null}finally{setSaving(false)}
  };

  const ensureTest=async()=>isNew?await saveTest():id;

  const formOptions=()=>q.options.map((text:string,i:number)=>({
    option_key:String.fromCharCode(65+i),option_text:text,is_correct:q.correct.includes(i)
  })).filter((o:any)=>o.option_text.trim());

  const saveQuestion=async()=>{
    const tid=await ensureTest();if(!tid)return;
    if(!q.question_text.trim())return alert("Enter the question text.");

    const editing=Boolean(q.id);
    const r=await fetch(editing?`/api/admin/mock-questions/${q.id}`:`/api/admin/mock-tests/${tid}/questions`,{
      method:editing?"PATCH":"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({...q,options:formOptions()})
    });
    const d=await r.json();
    if(!r.ok)return alert(d.error||"Unable to save question");
    setQ(blankQuestion());
    await loadQuestions(tid);
  };

  const editQuestion=(item:any)=>{
    const opts=[...(item.options??[])].sort((a:any,b:any)=>Number(a.sort_order)-Number(b.sort_order));
    const optionTexts=Array.from({length:Math.max(4,opts.length)},(_,i)=>opts[i]?.option_text??"");
    const correct=opts.map((o:any,i:number)=>o.is_correct?i:-1).filter((i:number)=>i>=0);
    setQ({...blankQuestion(),...item,options:optionTexts,correct:correct.length?correct:[0],answer_text:item.answer_text??"",answer_numeric:item.answer_numeric??"",answer_tolerance:item.answer_tolerance??0,paragraph_text:item.paragraph_text??""});
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const deleteQuestion=async(item:any)=>{
    if(!confirm("Delete this question from the test and question bank?"))return;
    const r=await fetch(`/api/admin/mock-questions/${item.id}`,{method:"DELETE"});
    const d=await r.json();
    if(!r.ok)return alert(d.error||"Unable to delete");
    if(q.id===item.id)setQ(blankQuestion());
    await loadQuestions(id);
  };

  const publish=async()=>{
    const tid=await ensureTest();if(!tid)return;
    const r=await fetch(`/api/admin/mock-tests/${tid}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({...form,status:"published"})});
    const d=await r.json();
    if(!r.ok)return alert(d.error||"Unable to publish");
    setForm((f:any)=>({...f,status:"published"}));
    alert("Test published successfully.");
  };

  const choice=!["fill_blank","numeric_answer"].includes(q.question_type);
  const multiple=q.question_type==="mcq_multiple";
  const unverified=questions.filter(x=>x.verification_status!=="verified").length;

  return <AdminMockShell active="create"><div className="ia-content">
    <AdminBackTitle title="Create Mock Test"/>

    <div className="ia-admin-grid">
      <div>
        <section className="ia-panel">
          <h3>Test Information</h3>
          <div className="ia-form-grid">
            <div className="ia-field full"><label>Test Title *</label><input className="ia-input" value={form.title} onChange={e=>set("title",e.target.value)} placeholder="UPSC CSE Prelims 2024 – Full Length Test 01"/></div>
            <div className="ia-field"><label>Exam Category *</label><select className="ia-select" value={form.exam_category} onChange={e=>set("exam_category",e.target.value)}><option>UPSC CSE Prelims</option><option>UPSC</option><option>State PCS</option><option>SSC</option><option>Banking</option></select></div>
            <div className="ia-field"><label>Test Type *</label><select className="ia-select" value={form.test_type} onChange={e=>set("test_type",e.target.value)}><option value="full_length">Full Length Test</option><option value="subject">Subject Wise</option><option value="daily_quiz">Daily Quiz</option><option value="pyq">PYQ Test</option></select></div>
            <div className="ia-field"><label>Subject</label><input className="ia-input" value={form.subject??""} onChange={e=>set("subject",e.target.value)}/></div>
            <div className="ia-field"><label>Language</label><select className="ia-select" value={form.language} onChange={e=>set("language",e.target.value)}><option>English</option><option>Hindi</option></select></div>
            <div className="ia-field full"><label>Description</label><textarea className="ia-textarea" value={form.description??""} onChange={e=>set("description",e.target.value)} placeholder="This test is based on the latest exam pattern."/></div>
          </div>
        </section>

        <section className="ia-panel">
          <h3>Test Settings</h3>
          <div className="ia-form-grid">
            <div className="ia-field"><label>Total Questions</label><input className="ia-input" value={questions.length} readOnly/></div>
            <div className="ia-field"><label>Total Marks *</label><input className="ia-input" type="number" value={form.total_marks} onChange={e=>set("total_marks",Number(e.target.value))}/></div>
            <div className="ia-field"><label>Duration (Minutes) *</label><input className="ia-input" type="number" value={form.duration_minutes} onChange={e=>set("duration_minutes",Number(e.target.value))}/></div>
            <div className="ia-field"><label>Negative Marking</label><input className="ia-input" type="number" step=".01" value={form.negative_marking} onChange={e=>set("negative_marking",Number(e.target.value))}/></div>
            <div className="ia-field"><label>Passing Marks (%)</label><input className="ia-input" type="number" value={form.passing_marks} onChange={e=>set("passing_marks",Number(e.target.value))}/></div>
            <div className="ia-field"><label>Status</label><input className="ia-input" value={form.status} readOnly/></div>
          </div>
          <div className="ia-toggle-row">
            <label className="ia-switch"><span>Show Answers After Submit</span><input type="checkbox" checked={!!form.show_answers_after_submit} onChange={e=>set("show_answers_after_submit",e.target.checked)}/></label>
            <label className="ia-switch"><span>Show Solutions</span><input type="checkbox" checked={!!form.show_solutions} onChange={e=>set("show_solutions",e.target.checked)}/></label>
          </div>
          <div className="ia-status-line">
            <span>{questions.length} questions</span>
            <span className={unverified?"warn":"ok"}>{unverified?`${unverified} need verification`:"All questions verified"}</span>
            <span>{form.status}</span>
          </div>
        </section>
      </div>

      <section className="ia-panel" style={{alignSelf:"start"}}>
        <h3>{q.id?"Edit Question":"Add Question Manually"}</h3>
        <div className="ia-field"><label>Question Type</label><select className="ia-select" value={q.question_type} onChange={e=>setQ((x:any)=>({...x,question_type:e.target.value}))}>{TYPES.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></div>
        {q.question_type==="paragraph_based"&&<div className="ia-field" style={{marginTop:9}}><label>Passage / Paragraph</label><textarea className="ia-textarea" value={q.paragraph_text} onChange={e=>setQ((x:any)=>({...x,paragraph_text:e.target.value}))}/></div>}
        <div className="ia-field" style={{marginTop:9}}><label>Question</label><textarea className="ia-textarea" value={q.question_text} onChange={e=>setQ((x:any)=>({...x,question_text:e.target.value}))} placeholder="Enter the question text"/></div>
        <div className="ia-form-grid" style={{marginTop:9}}>
          <div className="ia-field"><label>Marks</label><input className="ia-input" type="number" value={q.marks} onChange={e=>setQ((x:any)=>({...x,marks:Number(e.target.value)}))}/></div>
          <div className="ia-field"><label>Negative Marks</label><input className="ia-input" type="number" step=".01" value={q.negative_marks} onChange={e=>setQ((x:any)=>({...x,negative_marks:Number(e.target.value)}))}/></div>
        </div>

        {choice&&<div style={{display:"grid",gap:7,marginTop:9}}>{q.options.map((o:string,i:number)=><div key={i} style={{display:"grid",gridTemplateColumns:"28px 1fr 24px",gap:6,alignItems:"center"}}>
          <span style={{color:"#e1c660",fontSize:11}}>{String.fromCharCode(65+i)}</span>
          <input className="ia-input" value={o} placeholder={`Option ${String.fromCharCode(65+i)}`} onChange={e=>setQ((x:any)=>({...x,options:x.options.map((a:string,j:number)=>j===i?e.target.value:a)}))}/>
          <input type={multiple?"checkbox":"radio"} name="correct" checked={q.correct.includes(i)} onChange={()=>setQ((x:any)=>({...x,correct:multiple?(x.correct.includes(i)?x.correct.filter((n:number)=>n!==i):[...x.correct,i]):[i]}))}/>
        </div>)}</div>}

        {q.question_type==="fill_blank"&&<div className="ia-field" style={{marginTop:9}}><label>Correct Answer (use | for accepted alternatives)</label><input className="ia-input" value={q.answer_text} onChange={e=>setQ((x:any)=>({...x,answer_text:e.target.value}))}/></div>}
        {q.question_type==="numeric_answer"&&<div className="ia-form-grid" style={{marginTop:9}}><div className="ia-field"><label>Correct Numeric Answer</label><input className="ia-input" type="number" step="any" value={q.answer_numeric} onChange={e=>setQ((x:any)=>({...x,answer_numeric:e.target.value}))}/></div><div className="ia-field"><label>Tolerance ±</label><input className="ia-input" type="number" step="any" value={q.answer_tolerance} onChange={e=>setQ((x:any)=>({...x,answer_tolerance:Number(e.target.value)}))}/></div></div>}
        <div className="ia-field" style={{marginTop:9}}><label>Explanation / Solution</label><textarea className="ia-textarea" value={q.explanation} onChange={e=>setQ((x:any)=>({...x,explanation:e.target.value}))}/></div>
        <div className="ia-form-grid" style={{marginTop:9}}><div className="ia-field"><label>Verification</label><select className="ia-select" value={q.verification_status} onChange={e=>setQ((x:any)=>({...x,verification_status:e.target.value}))}><option value="verified">Verified</option><option value="needs_verification">Needs Verification</option></select></div><div className="ia-field"><label>Difficulty</label><select className="ia-select" value={q.difficulty} onChange={e=>setQ((x:any)=>({...x,difficulty:e.target.value}))}><option>easy</option><option>medium</option><option>hard</option></select></div></div>
        <div className="ia-action-stack"><button className="ia-outline" onClick={saveQuestion}>{q.id?<Save size={14}/>:<Plus size={14}/>} {q.id?"Save Question":"Add Question"}</button>{q.id&&<button className="ia-outline" onClick={()=>setQ(blankQuestion())}><XCircle size={14}/> Cancel Editing</button>}</div>
      </section>
    </div>

    {!isNew&&<SmartImportPanel testId={id} defaults={{exam:form.exam_category,subject:form.subject,language:form.language,marks:2,negativeMarks:form.negative_marking}} onImported={()=>loadQuestions(id)}/>}
    {isNew&&<section className="ia-panel ia-smart-placeholder"><SparklesMessage/></section>}

    <section className="ia-panel" style={{marginTop:12}}>
      <div className="ia-section-title"><h2 style={{color:"#f1d371"}}>Questions in this Test</h2><span style={{fontSize:10,color:"#aac0b7"}}>{questions.length} total</span></div>
      <div className="ia-question-list">
        {questions.length===0&&<div className="ia-empty-dark">No questions yet. Add one manually or use Smart Import.</div>}
        {questions.map((item:any,i:number)=><div className={`ia-question-mini ${item.verification_status!=="verified"?"needs-review":""}`} key={item.id}>
          <div className="ia-question-mini-copy"><strong>Q{i+1}</strong> {item.question_text}<small>{item.question_type} · {item.verification_status}{item.source_pdf?` · ${item.source_pdf}`:""}</small></div>
          <div className="ia-question-mini-actions">{item.verification_status==="verified"?<CheckCircle2 size={14}/>:<XCircle size={14}/>}<button onClick={()=>editQuestion(item)} title="Edit"><Pencil size={13}/></button><button onClick={()=>deleteQuestion(item)} title="Delete"><Trash2 size={13}/></button></div>
        </div>)}
      </div>
    </section>

    <div className="ia-admin-footer">
      <button className="ia-outline" onClick={()=>window.location.href="/admin/mock-test/tests"}>Cancel</button>
      <button className="ia-outline" disabled={saving} onClick={saveTest}><Save size={14}/>{saving?"Saving…":"Save Draft"}</button>
      <button className="ia-gold-btn" disabled={saving||!questions.length} onClick={publish}>Publish Test</button>
    </div>
  </div></AdminMockShell>
}

function SparklesMessage(){
  return <div style={{textAlign:"center",padding:12}}><div style={{color:"#e5c766",fontWeight:800}}>Save the new test first to enable Smart Import.</div><p style={{fontSize:11,color:"#aac0b7"}}>After saving, you can upload PDF, DOCX, TXT, MD, CSV, or paste text.</p></div>
}
