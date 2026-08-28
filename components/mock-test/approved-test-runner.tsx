"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Flag, Eraser, ChevronLeft, ChevronRight } from "lucide-react";

export default function ApprovedTestRunner({testId}:{testId:string}) {
  const router = useRouter();
  const [boot,setBoot] = useState<any>(null);
  const [answers,setAnswers] = useState<Record<string,string[]>>({});
  const [textAnswers,setTextAnswers] = useState<Record<string,string>>({});
  const [numericAnswers,setNumericAnswers] = useState<Record<string,string>>({});
  const [review,setReview] = useState<Record<string,boolean>>({});
  const [visited,setVisited] = useState<Record<string,boolean>>({});
  const [index,setIndex] = useState(0);
  const [seconds,setSeconds] = useState(0);
  const [paletteOpen,setPaletteOpen] = useState(false);
  const [saving,setSaving] = useState(false);
  const started = useRef(Date.now());
  const debounce = useRef<number | null>(null);

  useEffect(()=>{
    fetch(`/api/mock-tests/${testId}/start`,{method:"POST"})
      .then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to start");return d})
      .then(d=>{
        setBoot(d);
        const a:Record<string,string[]>={},ta:Record<string,string>={},na:Record<string,string>={},m:Record<string,boolean>={};
        for(const row of d.savedAnswers??[]){
          a[row.question_id]=row.selected_option_ids??[];
          ta[row.question_id]=row.text_answer??"";
          na[row.question_id]=row.numeric_answer==null?"":String(row.numeric_answer);
          m[row.question_id]=!!row.marked_for_review;
        }
        setAnswers(a);setTextAnswers(ta);setNumericAnswers(na);setReview(m);
        const elapsed=Math.max(0,Math.floor((Date.now()-new Date(d.attempt.started_at).getTime())/1000));
        setSeconds(Math.max(0,Number(d.test.duration_minutes)*60-elapsed));
      })
      .catch(e=>alert(e.message));
  },[testId]);

  const save = useCallback(async(qid:string, ids:string[], marked:boolean, textAnswer?:string, numericAnswer?:string)=>{
    if(!boot?.attempt?.id)return;
    setSaving(true);
    try{
      await fetch(`/api/mock-attempts/${boot.attempt.id}/answer`,{
        method:"PUT",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          questionId:qid,
          selectedOptionIds:ids,
          markedForReview:marked,
          textAnswer:textAnswer ?? null,
          numericAnswer:numericAnswer ?? null,
          timeSpentSeconds:Math.max(0,Math.floor((Date.now()-started.current)/1000))
        })
      });
    } finally {setSaving(false)}
  },[boot]);

  const submit = useCallback(async()=>{
    if(!boot?.attempt?.id)return;
    const r=await fetch(`/api/mock-attempts/${boot.attempt.id}/submit`,{method:"POST"});
    const d=await r.json();
    if(!r.ok){alert(d.error||"Unable to submit");return}
    router.replace(`/mock-test/result/${boot.attempt.id}`);
  },[boot,router]);

  useEffect(()=>{
    if(!boot)return;
    if(seconds<=0){submit();return}
    const t=setInterval(()=>setSeconds(s=>Math.max(0,s-1)),1000);
    return()=>clearInterval(t)
  },[boot,seconds,submit]);

  const qs=boot?.questions??[];
  const current=qs[index];

  useEffect(()=>{
    if(current) setVisited(v=>({...v,[current.id]:true}));
  },[current?.id]);

  const status=useMemo(()=>qs.map((q:any)=>{
    const hasChoice=(answers[q.id]?.length??0)>0;
    const hasText=Boolean((textAnswers[q.id]??"").trim());
    const hasNumeric=(numericAnswers[q.id]??"")!=="";
    const answered=hasChoice||hasText||hasNumeric;
    const marked=!!review[q.id];
    if(answered&&marked)return"answered-review";
    if(marked)return"review";
    if(answered)return"answered";
    if(visited[q.id])return"not-answered";
    return"not-visited";
  }),[qs,answers,textAnswers,numericAnswers,review,visited]);

  if(!current)return <div className="ia-runner"><div style={{padding:30}}>Preparing secure test session…</div></div>;

  const choose=(oid:string)=>{
    const multi=current.question_type==="mcq_multiple";
    const prev=answers[current.id]??[];
    const next=multi?(prev.includes(oid)?prev.filter(x=>x!==oid):[...prev,oid]):[oid];
    setAnswers(a=>({...a,[current.id]:next}));
    save(current.id,next,!!review[current.id],textAnswers[current.id],numericAnswers[current.id]);
  };

  const typed=(value:string, numeric=false)=>{
    if(numeric)setNumericAnswers(a=>({...a,[current.id]:value}));
    else setTextAnswers(a=>({...a,[current.id]:value}));
    if(debounce.current)window.clearTimeout(debounce.current);
    debounce.current=window.setTimeout(()=>{
      save(
        current.id,
        answers[current.id]??[],
        !!review[current.id],
        numeric?textAnswers[current.id]:value,
        numeric?value:numericAnswers[current.id]
      );
    },500);
  };

  const clear=()=>{
    setAnswers(a=>({...a,[current.id]:[]}));
    setTextAnswers(a=>({...a,[current.id]:""}));
    setNumericAnswers(a=>({...a,[current.id]:""}));
    save(current.id,[],!!review[current.id],"","");
  };

  const mark=()=>{
    const n=!review[current.id];
    setReview(r=>({...r,[current.id]:n}));
    save(current.id,answers[current.id]??[],n,textAnswers[current.id],numericAnswers[current.id]);
  };

  const move=(i:number)=>{
    started.current=Date.now();
    setIndex(Math.max(0,Math.min(qs.length-1,i)));
    setPaletteOpen(false);
  };

  const sections=Array.from(new Set(qs.map((q:any)=>q.section_title||"General Studies")));
  const attempted=qs.filter((q:any)=>status[qs.indexOf(q)]==="answered"||status[qs.indexOf(q)]==="answered-review").length;
  const mm=Math.floor(seconds/60),ss=seconds%60;
  const typedQuestion=current.question_type==="fill_blank"||current.question_type==="numeric_answer";

  return <div className="ia-runner">
    <header className="ia-runner-head">
      <div style={{fontSize:11}}>♛ &nbsp;{boot.test.title}</div>
      <div className="center">Time Left<strong>{String(mm).padStart(2,"0")}:{String(ss).padStart(2,"0")}</strong></div>
      <div className="right">
        <span style={{fontSize:10}}>Question {index+1} of {qs.length}</span>
        <button className="ia-outline" style={{padding:"7px 10px"}} onClick={()=>setPaletteOpen(v=>!v)}><Menu size={13}/></button>
        <button className="ia-outline" style={{padding:"7px 10px"}} onClick={()=>confirm("Finish and submit this test?")&&submit()}>Finish Test</button>
      </div>
    </header>

    <div className="ia-runner-body">
      <aside className="ia-runner-side">
        <h4>Sections</h4>
        {sections.map(sec=><div className="ia-section-row" key={String(sec)}><span>{String(sec)}</span><span>{attempted}/{qs.length}</span></div>)}
        <div className="ia-legend">
          <span><i className="ia-dot answered"/>Answered</span>
          <span><i className="ia-dot notanswered"/>Not Answered</span>
          <span><i className="ia-dot review"/>Marked for Review</span>
          <span><i className="ia-dot"/>Not Visited</span>
        </div>
      </aside>

      <main className="ia-runner-question">
        <div className="ia-q-number">Question {index+1}</div>
        {current.paragraph_text&&<div className="ia-passage">{current.paragraph_text}</div>}
        <div className="ia-q-text">{current.question_text}</div>

        {!typedQuestion&&<div className="ia-options">{current.options.map((o:any)=><button className={`ia-option ${(answers[current.id]??[]).includes(o.id)?"selected":""}`} key={o.id} onClick={()=>choose(o.id)}><span className="letter">{o.option_key}</span><span>{o.option_text}</span></button>)}</div>}

        {current.question_type==="fill_blank"&&<div className="ia-typed-answer"><label>Your Answer</label><input value={textAnswers[current.id]??""} onChange={e=>typed(e.target.value,false)} placeholder="Type your answer"/></div>}

        {current.question_type==="numeric_answer"&&<div className="ia-typed-answer"><label>Your Numeric Answer</label><input type="number" step="any" value={numericAnswers[current.id]??""} onChange={e=>typed(e.target.value,true)} placeholder="Enter a number"/></div>}

        <div style={{display:"flex",gap:8,marginTop:14}}>
          <button className="ia-chip" onClick={clear}><Eraser size={12}/> Clear Response</button>
          <button className="ia-chip" onClick={mark}><Flag size={12}/> {review[current.id]?"Marked":"Mark for Review"}</button>
        </div>

        <div className="ia-runner-actions">
          <button className="ia-chip" disabled={index===0} onClick={()=>move(index-1)}><ChevronLeft size={13}/> Previous</button>
          <button className="ia-primary" disabled={index===qs.length-1} onClick={()=>move(index+1)}>Save & Next <ChevronRight size={13}/></button>
        </div>
      </main>

      <aside className={`ia-runner-side right ${paletteOpen?"open":""}`}>
        <h4>All Questions</h4>
        <div className="ia-palette">{qs.map((q:any,i:number)=><button key={q.id} className={`${status[i]} ${index===i?"current":""}`} onClick={()=>move(i)}>{i+1}</button>)}</div>
        <div className="ia-legend">
          <span><i className="ia-dot answered"/>Answered</span>
          <span><i className="ia-dot notanswered"/>Not Answered</span>
          <span><i className="ia-dot review"/>Marked for Review</span>
          <span><i className="ia-dot"/>Not Visited</span>
        </div>
        <div style={{marginTop:18,fontSize:9,color:"#777"}}>{saving?"Saving answer…":"Answers saved"}</div>
      </aside>
    </div>
  </div>
}
