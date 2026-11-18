export async function sendCourseReceipt(input:{to:string;cc?:string|null;buyer:string;institute:string;course:string;receipt:string;amountPaise:number}){
  const key=process.env.RESEND_API_KEY,from=process.env.RECEIPT_FROM_EMAIL;
  if(!key||!from)return {sent:false,reason:"Receipt email service is not configured"};
  const safe=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c));
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[input.to],...(input.cc?{cc:[input.cc]}:{}),subject:`${input.institute} course payment receipt ${input.receipt}`,html:`<h1>Payment receipt</h1><p>${safe(input.institute)}</p><p>Received from ${safe(input.buyer)} for ${safe(input.course)}.</p><p>Amount paid: ₹${(input.amountPaise/100).toFixed(2)}</p><p>Receipt: ${safe(input.receipt)}</p>`})});
  return {sent:response.ok,reason:response.ok?null:`Email provider returned ${response.status}`};
}
