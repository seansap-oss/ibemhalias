"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminTests() {
  const [tests,setTests]=useState<any[]>([]);
  const [title,setTitle]=useState("");
  const load=()=>fetch("/api/admin/mock-tests").then(r=>r.json()).then(d=>setTests(d.tests??[]));
  useEffect(()=>{load()},[]);
  const create=async()=>{
    if(!title.trim()) return;
    await fetch("/api/admin/mock-tests",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title})});
    setTitle(""); load();
  };
  const setStatus=async(id:string,status:string)=>{
    await fetch(`/api/admin/mock-tests/${id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status})});
    load();
  };
  return <div className="mock-shell"><div className="mock-wrap">
    <p className="mock-kicker">ADMIN • TESTS</p><h1>Tests</h1>
    <div className="mock-toolbar"><div className="mock-search"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="New test title"/></div><button className="mock-primary" onClick={create}>Create Draft Test</button></div>
    <div className="mock-grid">{tests.map(t=><article className="mock-card" key={t.id}>
      <div className="mock-card-top"><span>{t.exam_category}</span><b>{t.status}</b></div><h3>{t.title}</h3><p>{t.description||"No description yet."}</p>
      <div className="result-actions">
        <Link className="mock-secondary" href={`/admin/mock-test/tests/${t.id}`}>Edit</Link>
        {t.status!=="published"?<button className="mock-primary" onClick={()=>setStatus(t.id,"published")}>Publish</button>:<button className="mock-secondary" onClick={()=>setStatus(t.id,"draft")}>Unpublish</button>}
      </div>
    </article>)}</div>
  </div></div>
}
