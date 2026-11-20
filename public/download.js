/* Phone-friendly PDFs with clickable official sources. No upload or server file storage. */
window.DateCard = (() => {
  const money = cents => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(cents / 100);
  const clean = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/…/g,'...').replace(/[^\x20-\x7e\n]/g,'');
  const placeTitle=pick=>pick.venue&&['dinner','treat'].includes(pick.category)?pick.venue.name:pick.name;
  function text(plan) {
    const picks=window.MashJourney?MashJourney.ordered(plan):plan.picks;
    return [plan.title || 'DATE NIGHT MASH', `Date: ${plan.date || 'Not selected'} | Area: ${plan.area || 'general'}`,
      ...(plan.schedule?[`Suggested time: ${plan.schedule.start}–${plan.schedule.end} | Starting town: ${plan.journey.origin}`,plan.schedule.notice]:[]),
      `Setting: ${plan.setting} | Mood: ${plan.mood || 'surprise'} | Spending: ${plan.spending || 'flexible'}`,
      `Budget for two: ${money(plan.budgetCents)}`, '', ...picks.flatMap(pick => [
        `${pick.category.toUpperCase()}: ${placeTitle(pick)} - ${money(pick.costCents)}`, pick.venue&&['dinner','treat'].includes(pick.category)?'Choose from their menu. The budget uses a checked sample order, not a guaranteed final bill.':pick.description,
        ...(plan.schedule?[`Suggested visit: ${plan.schedule.stops.find(s=>s.id===pick.id).start}–${plan.schedule.stops.find(s=>s.id===pick.id).end}`]:[]),
        ...(pick.home?[...(pick.guide?[`Prep ${pick.guide.prepMinutes} min; active ${pick.guide.activeMinutes} min; elapsed about ${pick.guide.totalMinutes} min; ${pick.guide.difficulty}`,pick.guide.quantityNote]:[]),`Ingredients: ${(pick.guide?pick.guide.ingredients.map(item=>item.quantity+' '+item.name):pick.home.ingredients).join(', ')||'See the idea description'}`,`Supplies: ${pick.home.supplies.join(', ')}`,...(pick.guide?.steps?.length?pick.guide.steps:pick.home.instructions).map((step,index)=>`${index+1}. ${step}`),pick.costBasis]:[]),
        ...(pick.place?[pick.place.address||'Map pin only; address unconfirmed',`Community listing: ${pick.place.sourceUrl}`,`Directions: https://www.google.com/maps/dir/?api=1&destination=${pick.place.lat},${pick.place.lon}`,'Price is your personal estimate, not a verified menu/admission quote.']:[]),
        ...(pick.venue ? [pick.venue.address, pick.venue.hoursNote, pick.pricing.order,
          `Posted ${money(pick.pricing.baseCents)}; estimated tax ${money(pick.pricing.taxCents)}; optional tip ${money(pick.pricing.tipCents)}; optional donation ${money(pick.pricing.donationCents)}`,
          pick.pricing.taxNote, pick.pricing.tipNote, pick.pricing.exclusions,
          `Official source (checked ${pick.pricing.checkedOn}): ${pick.pricing.sourceUrl}`] : []), '']),
      ...(window.DateRoute?[DateRoute.analyze(plan).notice,...DateRoute.analyze(plan).legs.map(leg=>`${placeTitle(plan.picks.find(p=>p.id===leg.id))}: ${leg.miles===null?'endpoint unverified':leg.miles+' approximate straight-line miles from previous point'}`)]:[]),
      ...(plan.reserveCents?[`Selected picks: ${money(plan.totalCents)}`,`Reserve: parking ${money(Math.round(plan.reserve.parking*100))}; transportation ${money(Math.round(plan.reserve.transport*100))}; extras ${money(Math.round(plan.reserve.extras*100))}. Your allowances, not quotes.`]:[]),
      `Estimated total${plan.reserveCents?' including reserve':''}: ${money(plan.totalCents+(plan.reserveCents||0))}`, `Remaining budget: ${money(plan.remainingCents)}`,
      ...(window.DateCosts?[`Already owned: ${(plan.pantry||[]).join(', ')||'None selected'}`,...DateCosts.resolve(plan.picks,plan.pantry||[]).shoppingList.map(line=>`Buy once: ${line.name} - ${money(line.cents)}`)]:[]), '', plan.notice].join('\n');
  }
  function create(plan) {
    const picks=window.MashJourney?MashJourney.ordered(plan):plan.picks;
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
      label(`${number} / ${picks.length+1}`,368,34,10,false,[103,95,114]);
      label('A plan for two. Confirm prices, hours and availability.',28,696,9,false,[103,95,114]);
    }
    page(1);
    let y=paragraph(plan.title || 'Your next little adventure',28,82,376,27,[41,35,51]);
    y=paragraph(`${plan.date || 'Pick a date'}${plan.schedule?' | '+plan.schedule.start+'-'+plan.schedule.end:''} | ${plan.journey?.origin||'Your selected ideas'}`,28,y+8,376,12);
    y+=16;
    label(`Budget ${money(plan.budgetCents)}    Plan ${money(plan.totalCents+(plan.reserveCents||0))}`,28,y,15,true);
    label(`${money(plan.remainingCents)} remaining | ${plan.spending === 'treat' ? 'Treat us' : 'Flexible'}`,28,y+23,11);
    y+=44;
    if(plan.reserveCents){y=paragraph(`Selected picks ${money(plan.totalCents)} + reserve ${money(plan.reserveCents)}. Parking ${money(Math.round(plan.reserve.parking*100))}, transport ${money(Math.round(plan.reserve.transport*100))}, extras ${money(Math.round(plan.reserve.extras*100))}. Allowances, not quotes.`,28,y,376,10)+10;}
    picks.forEach((pick,index)=>{
      pdf.setFillColor(...colors[['dinner','activity','treat','entertainment'].indexOf(pick.category)]); pdf.roundedRect(24,y,384,82,10,10,'F');
      label(`${index+1}  ${pick.category.toUpperCase()}`,38,y+20,9,true);
      pdf.setFont('helvetica','bold');pdf.setFontSize(13);pdf.setTextColor(41,35,51);
      const title=pdf.splitTextToSize(clean(placeTitle(pick)),268);
      pdf.text(title.slice(0,2),38,y+42,{lineHeightFactor:1.2});
      label(money(pick.costCents),324,y+42,13,true);
      const stop=plan.schedule?.stops.find(s=>s.id===pick.id);
      label(`${pick.home?'At home':pick.venue?pick.venue.city+', NJ':pick.place?'Community map listing':'Location to arrange'}${stop?' | '+stop.start+'-'+stop.end:''}`,38,y+70,10);
      y+=92;
    });
    paragraph('Suggested stops, not a timed booking. Tap the source and map links on the following pages. Traffic can push a drive beyond an hour. Reserve amounts are your allowances. Confirm actual travel, parking and fees before going.',28,y+2,376,10);
    picks.forEach((pick,index)=>{
      pdf.addPage([432,720]);page(index+2);
      pdf.setFillColor(...colors[['dinner','activity','treat','entertainment'].indexOf(pick.category)]);pdf.roundedRect(24,54,384,30,9,9,'F');
      const stop=plan.schedule?.stops.find(s=>s.id===pick.id);
      label(`${index+1} / ${pick.category.toUpperCase()}${stop?' | '+stop.start+'-'+stop.end+' suggested':''}`,38,74,11,true);
      let next=paragraph(placeTitle(pick),28,118,376,23,[41,35,51]);
      next=paragraph(pick.venue ? pick.venue.address : pick.description,28,next+8,376,12);
      label(`${money(pick.costCents)} estimated for two`,28,next+26,18,true);
      next+=53;
      if(pick.venue) {
        const p=pick.pricing;
        label('BUDGET EXAMPLE',28,next,10,true,[112,66,210]);
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
        const route=window.DateDirections?DateDirections.to(pick.venue.address,{town:plan.mash?.origin||plan.journey?.origin||'Paterson',location:plan.location}):'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',destination:pick.venue.address,travelmode:'driving'});
        pdf.textWithLink('Check route in Maps',190,next,{url:route});
        paragraph(p.sourceUrl,28,next+22,376,9);
      } else {
        function flow(value,size=11){
          pdf.setFont('helvetica','normal');pdf.setFontSize(size);
          const lines=pdf.splitTextToSize(clean(value),376);
          for(const line of lines){if(next>658){pdf.addPage([432,720]);page(pdf.getNumberOfPages());next=74;}label(line,28,next,size);next+=size*1.4;}
          next+=8;
        }
        if(pick.home){
          if(pick.guide){flow(`PREP ${pick.guide.prepMinutes} min | ACTIVE ${pick.guide.activeMinutes} min | ELAPSED about ${pick.guide.totalMinutes} min | ${pick.guide.difficulty}`);flow(pick.guide.quantityNote,10);}
          flow('INGREDIENTS FOR TWO: '+((pick.guide?pick.guide.ingredients.map(item=>item.quantity+' '+item.name):pick.home.ingredients).join(', ')||'See the idea description.'));
          flow('SUPPLIES: '+pick.home.supplies.join(', '));
          (pick.guide?.steps?.length?pick.guide.steps:pick.home.instructions).forEach((step,index)=>flow(`${index+1}. ${step}`));
          flow('SHOPPING: '+(pick.purchases?.map(line=>`${line.name} ${money(line.cents)}`).join('; ')||'No additional purchase allowance. Shared basics may be charged to an earlier pick.'));
          flow(pick.costBasis,10);
        }else flow(pick.tip||'Make this idea your own.',13);
        if(pick.place){
          flow(pick.place.address||'Address unconfirmed; use the recorded map pin.');flow('Your personal price estimate; confirm the full bill.');
          if(next>620){pdf.addPage([432,720]);page(pdf.getNumberOfPages());next=74;}
          pdf.textWithLink('Community map source',28,next,{url:pick.place.sourceUrl});next+=28;
          pdf.textWithLink('Get directions',28,next,{url:window.DateDirections?DateDirections.to(`${pick.place.lat},${pick.place.lon}`,{town:plan.mash?.origin,location:plan.location}):'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',destination:`${pick.place.lat},${pick.place.lon}`})});next+=28;
        }
        flow('Planning estimates for two, not store quotes or reservations. Check the actual basket, full costs and availability.',10);
      }
    });
    if(window.DateRoute&&!DateRoute.analyze(plan).home){
      const route=DateRoute.analyze(plan);pdf.addPage([432,720]);page(pdf.getNumberOfPages());let at=78;
      function routeText(value,size=11){pdf.setFont('helvetica','normal');pdf.setFontSize(size);for(const line of pdf.splitTextToSize(clean(value),376)){if(at>650){pdf.addPage([432,720]);page(pdf.getNumberOfPages());at=78;}label(line,28,at,size);at+=size*1.4;}at+=10;}
      routeText('YOUR ROUTE & DEPARTURE CHECKS',17);routeText(`Starting area: ${plan.location?.label||plan.mash?.origin||plan.journey?.origin||'unverified'}`);routeText(route.notice);if(route.backtracking)routeText('Possible detour/backtracking: review the order in Maps.');
      for(const leg of route.legs){const pick=plan.picks.find(p=>p.id===leg.id);routeText(`${placeTitle(pick)}: ${leg.miles===null?'unverified endpoint':leg.miles+' approximate straight-line miles from previous point'}`);}
      routeText('Confirm hours, reservation/session requirements, age/guardian rules, actual prices, parking and fees for every stop. Nothing is booked. Official source and direction links are on each stop page.');
    }
    for(let number=1;number<=pdf.getNumberOfPages();number++){pdf.setPage(number);pdf.setFillColor(247,243,255);pdf.rect(350,20,70,22,'F');label(`${number} / ${pdf.getNumberOfPages()}`,368,34,10,false,[103,95,114]);}
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
