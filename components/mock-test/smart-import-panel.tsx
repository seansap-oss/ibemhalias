"use client";

import { useMemo, useRef, useState } from "react";
import {
  FileText, Sparkles, Upload, ClipboardPaste, Loader2, CheckCircle2,
  AlertTriangle, Trash2, ChevronDown, ChevronUp, RotateCcw
} from "lucide-react";

type DraftOption = {
  option_key: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
};

type DraftQuestion = {
  temp_id: string;
  selected: boolean;
  question_type: string;
  question_text: string;
  paragraph_text?: string | null;
  explanation?: string | null;
  exam?: string | null;
  subject?: string | null;
  topic?: string | null;
  difficulty?: string | null;
  marks: number;
  negative_marks: number;
  source?: string | null;
  source_pdf?: string | null;
  source_page?: number | null;
  verification_status: "verified" | "needs_verification";
  answer_text?: string | null;
  answer_numeric?: number | null;
  answer_tolerance?: number;
  options: DraftOption[];
};

const TYPES = [
  ["mcq_single","MCQ – Single Answer"],
  ["mcq_multiple","MCQ – Multiple Answer"],
  ["true_false","True / False"],
  ["statement_based","Statement Based"],
  ["assertion_reason","Assertion / Reason"],
  ["match_following","Match the Following"],
  ["fill_blank","Fill in the Blank"],
  ["numeric_answer","Numeric Answer"],
  ["paragraph_based","Paragraph Based"],
  ["mixed","Mixed Question Types"],
];

export default function SmartImportPanel({
  testId,
  defaults,
  onImported,
}:{
  testId:string;
  defaults:{exam?:string;subject?:string;language?:string;marks?:number;negativeMarks?:number};
  onImported:()=>void;
}) {
  const [mode,setMode]=useState<"existing"|"generate">("existing");
  const [sourceMode,setSourceMode]=useState<"file"|"paste">("file");
  const [file,setFile]=useState<File|null>(null);
  const [pastedText,setPastedText]=useState("");
  const [count,setCount]=useState(10);
  const [questionType,setQuestionType]=useState("mcq_single");
  const [difficulty,setDifficulty]=useState("mixed");
  const [optionCount,setOptionCount]=useState(4);
  const [marks,setMarks]=useState(Number(defaults.marks||1));
  const [negativeMarks,setNegativeMarks]=useState(Number(defaults.negativeMarks||0));
  const [subject,setSubject]=useState(defaults.subject||"");
  const [topic,setTopic]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [preview,setPreview]=useState<DraftQuestion[]>([]);
  const [sourceName,setSourceName]=useState("");
  const [servedBy,setServedBy]=useState<string|null>(null);
  const [openRows,setOpenRows]=useState<Record<string,boolean>>({});
  const fileRef=useRef<HTMLInputElement>(null);

  const selectedCount=useMemo(()=>preview.filter(q=>q.selected).length,[preview]);
  const needsReview=useMemo(()=>preview.filter(q=>q.selected&&q.verification_status!=="verified").length,[preview]);

  const resetPreview=()=>{
    setPreview([]);
    setMessage("");
    setServedBy(null);
    setSourceName("");
  };

  const analyse=async()=>{
    if(sourceMode==="file"&&!file)return setMessage("Choose a PDF, DOCX, TXT, MD, or CSV file.");
    if(sourceMode==="paste"&&!pastedText.trim())return setMessage("Paste the questions or source material first.");

    setBusy(true);setMessage("");setPreview([]);setServedBy(null);

    try{
      const fd=new FormData();
      fd.append("mode",mode);
      fd.append("count",String(count));
      fd.append("questionType",questionType);
      fd.append("difficulty",difficulty);
      fd.append("optionCount",String(optionCount));
      fd.append("marks",String(marks));
      fd.append("negativeMarks",String(negativeMarks));
      fd.append("language",defaults.language||"English");
      fd.append("exam",defaults.exam||"");
      fd.append("subject",subject);
      fd.append("topic",topic);
      if(sourceMode==="file"&&file)fd.append("file",file);
      if(sourceMode==="paste")fd.append("pastedText",pastedText);

      const r=await fetch(`/api/admin/mock-tests/${testId}/smart-import/preview`,{method:"POST",body:fd});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Unable to analyse source");

      setPreview(d.questions??[]);
      setSourceName(d.sourceName||file?.name||"Pasted text");
      setServedBy(d.servedBy||null);

      const parserText=d.usedAiParser?" AI was used only to interpret the existing question formatting.":"";
      setMessage(`${(d.questions??[]).length} draft question(s) ready for review.${parserText}`);
    }catch(e:any){
      setMessage(e.message);
    }finally{
      setBusy(false);
    }
  };

  const commit=async()=>{
    const selected=preview.filter(q=>q.selected);
    if(!selected.length)return setMessage("Select at least one question.");

    setBusy(true);setMessage("");
    try{
      const r=await fetch(`/api/admin/mock-tests/${testId}/smart-import/commit`,{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({mode,sourceName,questions:selected})
      });
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Unable to import questions");

      setMessage(`${d.imported} question(s) added to the test. ${d.needsVerification} still need teacher verification.`);
      setPreview([]);
      onImported();
    }catch(e:any){
      setMessage(e.message);
    }finally{
      setBusy(false);
    }
  };

  const patchQuestion=(id:string,patch:Partial<DraftQuestion>)=>{
    setPreview(rows=>rows.map(q=>q.temp_id===id?{...q,...patch}:q));
  };

  const patchOption=(qid:string,index:number,patch:Partial<DraftOption>)=>{
    setPreview(rows=>rows.map(q=>q.temp_id===qid?{
      ...q,
      options:q.options.map((o,i)=>i===index?{...o,...patch}:o)
    }:q));
  };

  const setCorrect=(qid:string,index:number)=>{
    setPreview(rows=>rows.map(q=>{
      if(q.temp_id!==qid)return q;
      const multiple=q.question_type==="mcq_multiple";
      return {
        ...q,
        options:q.options.map((o,i)=>({
          ...o,
          is_correct:i===index?!o.is_correct:(multiple?o.is_correct:false)
        }))
      };
    }));
  };

  return <section className="ia-panel ia-smart-import">
    <div className="ia-smart-title">
      <div><h3>Smart Import / AI Quiz Generator</h3><p>Import questions you already wrote, or generate a draft quiz from study material.</p></div>
      <Sparkles size={20}/>
    </div>

    <div className="ia-smart-mode">
      <button className={mode==="existing"?"active":""} onClick={()=>{setMode("existing");resetPreview()}}><FileText size={15}/><b>Existing Questions</b><span>Word, TXT, PDF, CSV or pasted questions</span></button>
      <button className={mode==="generate"?"active":""} onClick={()=>{setMode("generate");resetPreview()}}><Sparkles size={15}/><b>Generate from Content</b><span>Story, notes, chapter, article or study material</span></button>
    </div>

    <div className="ia-smart-source-tabs">
      <button className={sourceMode==="file"?"active":""} onClick={()=>setSourceMode("file")}><Upload size={13}/> Upload File</button>
      <button className={sourceMode==="paste"?"active":""} onClick={()=>setSourceMode("paste")}><ClipboardPaste size={13}/> Paste Text</button>
    </div>

    {sourceMode==="file"?<div className="ia-dropzone" onClick={()=>fileRef.current?.click()}>
      <input ref={fileRef} hidden type="file" accept=".pdf,.docx,.txt,.md,.csv,application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e=>{setFile(e.target.files?.[0]||null);resetPreview()}}/>
      <Upload size={20}/>
      <b>{file?file.name:"Choose PDF, DOCX, TXT, MD or CSV"}</b>
      <span>{file?`${(file.size/1024).toFixed(1)} KB`:"Maximum 25 MB"}</span>
    </div>:<textarea className="ia-smart-paste" value={pastedText} onChange={e=>{setPastedText(e.target.value);resetPreview()}} placeholder={mode==="existing"?"Paste your prepared questions here…":"Paste the study material, story, notes or article here…"}/>}

    <div className="ia-smart-settings">
      {mode==="generate"&&<div className="ia-field"><label>Generate Questions</label><input className="ia-input" type="number" min="1" max="50" value={count} onChange={e=>setCount(Math.max(1,Math.min(50,Number(e.target.value)||1)))}/></div>}
      <div className="ia-field"><label>Question Type</label><select className="ia-select" value={questionType} onChange={e=>setQuestionType(e.target.value)}>{TYPES.filter(([v])=>mode==="generate"||v!=="mixed").map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
      <div className="ia-field"><label>Difficulty</label><select className="ia-select" value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="mixed">Mixed</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div>
      {mode==="generate"&&<div className="ia-field"><label>Options</label><select className="ia-select" value={optionCount} onChange={e=>setOptionCount(Number(e.target.value))}><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option></select></div>}
      <div className="ia-field"><label>Marks</label><input className="ia-input" type="number" step=".01" value={marks} onChange={e=>setMarks(Number(e.target.value)||0)}/></div>
      <div className="ia-field"><label>Negative Marks</label><input className="ia-input" type="number" step=".01" value={negativeMarks} onChange={e=>setNegativeMarks(Number(e.target.value)||0)}/></div>
      <div className="ia-field"><label>Subject</label><input className="ia-input" value={subject} onChange={e=>setSubject(e.target.value)}/></div>
      <div className="ia-field"><label>Topic</label><input className="ia-input" value={topic} onChange={e=>setTopic(e.target.value)}/></div>
    </div>

    <div className="ia-smart-actions">
      <button className="ia-gold-btn" disabled={busy} onClick={analyse}>{busy?<Loader2 className="ia-spin" size={14}/>:<Sparkles size={14}/>} {mode==="existing"?"Analyse Existing Questions":"Generate Draft Questions"}</button>
      {preview.length>0&&<button className="ia-outline" disabled={busy} onClick={resetPreview}><RotateCcw size={13}/> Clear Preview</button>}
    </div>

    {message&&<div className="ia-import-message">{message}{servedBy&&<small>AI provider: {servedBy}</small>}</div>}

    {preview.length>0&&<div className="ia-smart-preview">
      <div className="ia-smart-preview-head"><div><h4>Review Before Import</h4><p>{selectedCount} selected · {needsReview} need verification</p></div><button className="ia-gold-btn" disabled={busy||selectedCount===0} onClick={commit}>Import {selectedCount} Question{selectedCount===1?"":"s"}</button></div>

      {preview.map((q,index)=>{
        const open=!!openRows[q.temp_id];
        return <article className={`ia-draft-card ${q.verification_status!=="verified"?"needs-review":""}`} key={q.temp_id}>
          <div className="ia-draft-head">
            <input type="checkbox" checked={q.selected} onChange={e=>patchQuestion(q.temp_id,{selected:e.target.checked})}/>
            <b>Q{index+1}</b>
            <span className="ia-draft-question">{q.question_text||"Untitled question"}</span>
            <span className={q.verification_status==="verified"?"verified":"needs"}>{q.verification_status==="verified"?<CheckCircle2 size={12}/>:<AlertTriangle size={12}/>} {q.verification_status.replace("_"," ")}</span>
            <button className="ia-draft-toggle" onClick={()=>setOpenRows(v=>({...v,[q.temp_id]:!open}))}>{open?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>
            <button className="ia-draft-toggle" onClick={()=>setPreview(rows=>rows.filter(x=>x.temp_id!==q.temp_id))}><Trash2 size={13}/></button>
          </div>

          {open&&<div className="ia-draft-editor">
            <div className="ia-field full"><label>Question</label><textarea className="ia-textarea" value={q.question_text} onChange={e=>patchQuestion(q.temp_id,{question_text:e.target.value})}/></div>
            <div className="ia-form-grid">
              <div className="ia-field"><label>Type</label><select className="ia-select" value={q.question_type} onChange={e=>patchQuestion(q.temp_id,{question_type:e.target.value})}>{TYPES.filter(([v])=>v!=="mixed").map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
              <div className="ia-field"><label>Verification</label><select className="ia-select" value={q.verification_status} onChange={e=>patchQuestion(q.temp_id,{verification_status:e.target.value as any})}><option value="needs_verification">Needs Verification</option><option value="verified">Verified</option></select></div>
            </div>

            {q.options.length>0&&<div className="ia-draft-options">{q.options.map((o,i)=><div key={i}>
              <input type={q.question_type==="mcq_multiple"?"checkbox":"radio"} name={`correct-${q.temp_id}`} checked={o.is_correct} onChange={()=>setCorrect(q.temp_id,i)}/>
              <span>{o.option_key}</span>
              <input value={o.option_text} onChange={e=>patchOption(q.temp_id,i,{option_text:e.target.value})}/>
            </div>)}</div>}

            {q.question_type==="fill_blank"&&<div className="ia-field"><label>Correct Answer</label><input className="ia-input" value={q.answer_text||""} onChange={e=>patchQuestion(q.temp_id,{answer_text:e.target.value})}/></div>}
            {q.question_type==="numeric_answer"&&<div className="ia-form-grid"><div className="ia-field"><label>Correct Numeric Answer</label><input className="ia-input" type="number" step="any" value={q.answer_numeric??""} onChange={e=>patchQuestion(q.temp_id,{answer_numeric:e.target.value===""?null:Number(e.target.value)})}/></div><div className="ia-field"><label>Tolerance ±</label><input className="ia-input" type="number" step="any" value={q.answer_tolerance??0} onChange={e=>patchQuestion(q.temp_id,{answer_tolerance:Number(e.target.value)||0})}/></div></div>}

            <div className="ia-field full"><label>Explanation / Solution</label><textarea className="ia-textarea" value={q.explanation||""} onChange={e=>patchQuestion(q.temp_id,{explanation:e.target.value})}/></div>
          </div>}
        </article>
      })}
    </div>}
  </section>
}
