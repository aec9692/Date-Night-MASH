/* Phone-friendly PDFs with clickable official sources. No upload or server file storage. */
window.DateCard = (() => {
  const money = cents => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(cents / 100);
  const clean = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/…/g,'...').replace(/[^\x20-\x7e\n]/g,'');
  function text(plan) {
    return [plan.title || 'DATE NIGHT MASH', `Date: ${plan.date || 'Not selected'} | Area: ${plan.area || 'general'}`,
      `Setting: ${plan.setting} | Mood: ${plan.mood || 'surprise'} | Spending: ${plan.spending || 'flexible'}`,
      `Budget for two: ${money(plan.budgetCents)}`, '', ...plan.picks.flatMap(pick => [
        `${pick.category.toUpperCase()}: ${pick.name} - ${money(pick.costCents)}`, pick.description,
        ...(pick.venue ? [pick.venue.address, pick.venue.hoursNote, pick.pricing.order,
          `Posted ${money(pick.pricing.baseCents)}; estimated tax ${money(pick.pricing.taxCents)}; optional tip ${money(pick.pricing.tipCents)}; optional donation ${money(pick.pricing.donationCents)}`,
          pick.pricing.taxNote, pick.pricing.tipNote, pick.pricing.exclusions,
          `Official source (checked ${pick.pricing.checkedOn}): ${pick.pricing.sourceUrl}`] : []), '']),
      `Estimated total: ${money(plan.totalCents)}`, `Remaining budget: ${money(plan.remainingCents)}`, '', plan.notice].join('\n');
  }
  function create(plan) {
    if (!window.jspdf?.jsPDF) throw new Error('PDF library unavailable');
    const pdf = new window.jspdf.jsPDF({ unit:'pt', format:[432,720], compress:true, putOnlyUsedFonts:true });
    pdf.setProperties({ title:clean(plan.title || 'Date Night MASH'), subject:'Date itinerary for two', creator:'Date Night MASH' });
    const colors = [[255,216,189],[232,220,255],[255,214,230],[220,235,183]];
    function label(value,x,y,size=12,bold=false,color=[41,35,51]) {
      pdf.setFont('helvetica',bold?'bold':'normal'); pdf.setFontSize(size); pdf.setTextColor(...color);
      pdf.text(clean(value) || 'Your idea',x,y);
    }
    function paragraph(value,x,y,width,size=11,color=[80,71,92]) {
      pdf.setFont('helvetica','normal'); pdf.setFontSize(size); pdf.setTextColor(...color);
      const lines=pdf.splitTextToSize(clean(value),width); pdf.text(lines,x,y,{lineHeightFactor:1.35});
      return y+lines.length*size*1.35;
    }
    function page(number) {
      pdf.setFillColor(247,243,255); pdf.rect(0,0,432,720,'F');
      label('DATE NIGHT MASH',28,34,11,true,[112,66,210]);
      label(`${number} / 5`,368,34,10,false,[103,95,114]);
      label('A plan for two. Confirm prices, hours and availability.',28,696,9,false,[103,95,114]);
    }
    page(1);
    let y=paragraph(plan.title || 'Your next little adventure',28,82,376,27,[41,35,51]);
    y=paragraph(`${plan.date || 'Pick a date'} | ${plan.area === 'paterson' ? 'Near Paterson, NJ' : 'Your selected ideas'}`,28,y+8,376,12);
    y+=16;
    label(`Budget ${money(plan.budgetCents)}    Plan ${money(plan.totalCents)}`,28,y,15,true);
    label(`${money(plan.remainingCents)} remaining | ${plan.spending === 'treat' ? 'Treat us' : 'Flexible'}`,28,y+23,11);
    y+=44;
    plan.picks.forEach((pick,index)=>{
      pdf.setFillColor(...colors[index]); pdf.roundedRect(24,y,384,82,10,10,'F');
      label(`${index+1}  ${pick.category.toUpperCase()}`,38,y+20,9,true);
      pdf.setFont('helvetica','bold');pdf.setFontSize(13);pdf.setTextColor(41,35,51);
      const title=pdf.splitTextToSize(clean(pick.name),268);
      pdf.text(title.slice(0,2),38,y+42,{lineHeightFactor:1.2});
      label(money(pick.costCents),324,y+42,13,true);
      if(pick.venue) label(`${pick.venue.city}, NJ`,38,y+70,10);
      y+=92;
    });
    paragraph('Suggested stops, not a timed booking. Tap the source and map links on the following pages. Traffic can push a drive beyond an hour. Travel, parking and unconfirmed fees are extra unless listed.',28,y+2,376,10);
    plan.picks.forEach((pick,index)=>{
      pdf.addPage([432,720]);page(index+2);
      pdf.setFillColor(...colors[index]);pdf.roundedRect(24,54,384,30,9,9,'F');
      label(`${index+1} / ${pick.category.toUpperCase()}`,38,74,11,true);
      let next=paragraph(pick.name,28,118,376,23,[41,35,51]);
      next=paragraph(pick.venue ? pick.venue.address : pick.description,28,next+8,376,12);
      label(`${money(pick.costCents)} estimated for two`,28,next+26,18,true);
      next+=53;
      if(pick.venue) {
        const p=pick.pricing;
        label('WHAT THIS COVERS',28,next,10,true,[112,66,210]);
        next=paragraph(p.order,28,next+20,376,12)+13;
        const rows=[['Posted subtotal',p.baseCents],['Estimated tax / reserve',p.taxCents],['Optional tip allowance',p.tipCents],['Optional donation',p.donationCents]];
        rows.forEach(([name,value])=>{label(name,28,next,11);label(money(value),340,next,11,true);next+=20;});
        next=paragraph(`${p.taxNote} ${p.tipNote}`,28,next+2,376,10)+13;
        label('BEFORE YOU GO',28,next,10,true,[112,66,210]);
        next=paragraph(`${pick.venue.hoursNote} ${p.exclusions}`,28,next+19,376,11)+16;
        label(`Source checked ${p.checkedOn} - recheck before booking.`,28,next,10);
        next+=25;
        pdf.setFontSize(12);pdf.setTextColor(75,36,153);
        pdf.textWithLink('Official price / menu',28,next,{url:p.sourceUrl});
        const route=new URL('https://www.google.com/maps/dir/');
        route.search=new URLSearchParams({api:'1',origin:'Paterson, NJ',destination:pick.venue.address,travelmode:'driving'});
        pdf.textWithLink('Check route from Paterson',190,next,{url:route.href});
        paragraph(p.sourceUrl,28,next+22,376,9);
      } else {
        next=paragraph(pick.tip || 'Make this idea your own.',28,next,376,13)+20;
        paragraph('This is a general idea or a personal estimate, not a verified local booking price. Check availability and full costs before making plans.',28,next,376,12);
      }
    });
    return pdf.output('blob');
  }
  function download(plan,format='pdf') {
    const isText=format==='txt';
    const blob=isText?new Blob([text(plan)],{type:'text/plain;charset=utf-8'}):create(plan);
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download=`date-night-mash-plan.${isText?'txt':'pdf'}`;
    if(!isText){link.target='_blank';link.rel='noopener';}
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  async function share(plan) {
    const file=new File([create(plan)],'date-night-mash-plan.pdf',{type:'application/pdf'});
    if(navigator.canShare?.({files:[file]})) return navigator.share({files:[file],title:plan.title || 'Our date plan'});
    download(plan);
  }
  return {create,download,share,text};
})();
