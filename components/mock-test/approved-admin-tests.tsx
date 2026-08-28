"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminMockShell, AdminBackTitle } from "./approved-shell";

export default function ApprovedAdminTests(){
  const [tests,setTests]=useState<any[]>([]);
  const [title,setTitle]=useState("");
  const load=()=>fetch("/api/admin/mock-tests").then(r=>r.json()).then(d=>setTests(d.tests??[]));
  useEffect(()=>{load()},[]);

  const create=async()=>{
    const name=title.trim()||"Untitled Mock Test";
    const r=await fetch("/api/admin/mock-tests",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title:name})});
    const d=await r.json();
    if(!r.ok){alert(d.error||"Unable to create test");return}
    window.location.href=`/admin/mock-test/tests/${d.test.id}`;
  };

  const status=async(id:string,next:string)=>{
    await fetch(`/api/admin/mock-tests/${id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:next})});
    load();
  };

  return <AdminMockShell active="tests"><div className="ia-content">
    <AdminBackTitle title="Mock Tests"/>
    <div className="ia-section-title"><h1 style={{color:"#f5e7bd"}}>All Tests</h1><Link href="/admin/mock-test/tests/new" className="ia-gold-btn"><Plus size={14}/> Create Test</Link></div>
    <div className="ia-panel" style={{marginBottom:14}}>
      <div className="ia-form-grid">
        <div className="ia-field"><label>Quick create draft</label><input className="ia-input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="New test title"/></div>
        <div className="ia-field" style={{alignSelf:"end"}}><button className="ia-outline" onClick={create}>Create Draft Test</button></div>
      </div>
    </div>
    <div className="ia-admin-tests">
      {tests.map(t=><article className="ia-admin-test-card" key={t.id}>
        <span className="status">{t.exam_category} · {t.status}</span>
        <h3>{t.title}</h3>
        <p>{t.description||"No description yet."}</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Link className="ia-outline" href={`/admin/mock-test/tests/${t.id}`}>Edit</Link>
          {t.status==="published"
            ? <button className="ia-outline" onClick={()=>status(t.id,"draft")}>Unpublish</button>
            : <button className="ia-gold-btn" onClick={()=>status(t.id,"published")}>Publish</button>}
        </div>
      </article>)}
    </div>
  </div></AdminMockShell>
}
