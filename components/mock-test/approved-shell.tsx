"use client";

import Link from "next/link";
import {
  LayoutDashboard, UserRound, BookOpen, Video, FileText, ClipboardCheck,
  Newspaper, Bookmark, BarChart3, MessageCircle, CircleHelp, LogOut,
  Users, GraduationCap, Settings, ChevronLeft
} from "lucide-react";

export function StudentMockShell({children, displayName="Student"}:{children:React.ReactNode;displayName?:string}) {
  const nav = [
    ["/student","Dashboard",LayoutDashboard],
    ["/student/profile","My Profile",UserRound],
    ["/student/courses","My Courses",BookOpen],
    ["/student/live-classes","Live Classes",Video],
    ["/student/study-materials","Study Material",FileText],
    ["/student/mock-tests","Mock Tests",ClipboardCheck],
    ["/student/current-affairs","Current Affairs",Newspaper],
    ["/student/bookmarks","Bookmarks",Bookmark],
    ["/student/progress","Performance",BarChart3],
    ["/student/messages","Messages",MessageCircle],
    ["/student/help","Help & Support",CircleHelp],
  ] as const;

  return <div className="ia-mock ia-layout">
    <aside className="ia-sidebar">
      <div className="ia-brand"><div className="ia-brand-mark">Ib</div><div className="ia-brand-copy"><strong>Ibemhal IAS</strong><span>A low-fee Institute</span></div></div>
      <nav className="ia-nav">
        {nav.map(([href,label,Icon])=><Link href={href} key={href} className={label==="Mock Tests"?"active":""}><Icon/><span>{label}</span></Link>)}
        <Link href="/"><LogOut/><span>Logout</span></Link>
      </nav>
    </aside>
    <main className="ia-main">
      <div className="ia-topbar">
        <div><h2>Hello, {displayName} 👋</h2><p>Let&apos;s continue your exam preparation.</p></div>
        <div className="ia-profile"><div className="ia-avatar">{displayName.slice(0,1).toUpperCase()}</div><div><strong style={{fontSize:11}}>{displayName}</strong><div style={{fontSize:9,color:"#d8e5df"}}>Student</div></div></div>
      </div>
      {children}
    </main>
  </div>
}

export function AdminMockShell({children, active="tests"}:{children:React.ReactNode;active?:"tests"|"create"|"questions"|"results"}) {
  const base = [
    ["/admin","Dashboard",LayoutDashboard],
    ["/admin/students","Students",Users],
    ["/admin/courses","Courses",GraduationCap],
    ["/admin/live-classes","Live Classes",Video],
    ["/admin/study-materials","Study Material",FileText],
  ] as const;

  return <div className="ia-layout ia-admin-main">
    <aside className="ia-sidebar">
      <div className="ia-brand"><div className="ia-brand-mark">Ib</div><div className="ia-brand-copy"><strong>Ibemhal IAS</strong><span>Admin Portal</span></div></div>
      <nav className="ia-nav">
        {base.map(([href,label,Icon])=><Link href={href} key={href}><Icon/><span>{label}</span></Link>)}
        <Link href="/admin/mock-test/tests" className="active"><ClipboardCheck/><span>Mock Tests</span></Link>
        <Link className="sub" href="/admin/mock-test/tests">All Tests</Link>
        <Link className={`sub ${active==="create"?"active":""}`} href="/admin/mock-test/tests/new">Create Test</Link>
        <Link className={`sub ${active==="questions"?"active":""}`} href="/admin/mock-test/questions">Question Bank</Link>
        <Link className={`sub ${active==="results"?"active":""}`} href="/admin/mock-test/results">Results</Link>
        <Link className={`sub ${active==="results"?"active":""}`} href="/admin/mock-test/reports">Reports</Link>
        <Link href="/admin/current-affairs"><Newspaper/><span>Current Affairs</span></Link>
        <Link href="/admin/settings"><Settings/><span>Site Settings</span></Link>
        <Link href="/"><LogOut/><span>Logout</span></Link>
      </nav>
    </aside>
    <main className="ia-main ia-admin-main">{children}</main>
  </div>
}

export function AdminBackTitle({title}:{title:string}) {
  return <div className="ia-admin-heading"><ChevronLeft size={17}/><span>Admin – {title}</span></div>
}
