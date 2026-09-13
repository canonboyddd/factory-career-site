(() => {
  const questions=[...document.querySelectorAll('.question')];
  const progress=document.querySelector('.diag-progress span');
  const prevBtn=document.getElementById('prevBtn');
  const nextBtn=document.getElementById('nextBtn');
  const result=document.getElementById('resultBox');
  const shell=document.getElementById('questionArea');
  let current=0,started=false;
  const answers={};

  const render=()=>{
    questions.forEach((q,i)=>q.classList.toggle('active',i===current));
    progress.style.width=`${((current+1)/questions.length)*100}%`;
    prevBtn.style.visibility=current===0?'hidden':'visible';
    nextBtn.textContent=current===questions.length-1?'結果を見る':'次へ';
    nextBtn.disabled=!questions[current].querySelector('.choice.selected');
  };

  questions.forEach(q=>q.querySelectorAll('.choice').forEach(btn=>btn.addEventListener('click',()=>{
    if(!started){started=true;window.trackSiteEvent?.('diagnosis_start',{page:'diagnosis'});}
    q.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');
    answers[q.dataset.key]={value:btn.dataset.value,score:Number(btn.dataset.score||0),expert:Number(btn.dataset.expert||0),night:Number(btn.dataset.night||0)};
    nextBtn.disabled=false;
  })));
  prevBtn.addEventListener('click',()=>{if(current>0){current--;render();}});
  nextBtn.addEventListener('click',()=>{if(!answers[questions[current].dataset.key])return;if(current<questions.length-1){current++;render();return;}showResult();});

  function showResult(){
    let raw=0,expert=0,night=0;Object.values(answers).forEach(a=>{raw+=a.score;expert+=a.expert;night+=a.night;});
    const score=Math.max(24,Math.min(92,Math.round(42+raw*4.2)));
    const job=answers.job?.value||'',intent=answers.intent?.value||'',change=answers.change?.value||'',income=answers.income?.value||'';
    let type='情報整理タイプ',title='今すぐ辞めるより、条件整理から始める段階です',desc='転職を急ぐ必要はありません。今の不満を「年収・勤務時間・仕事内容・人間関係」に分け、どの条件なら転職する価値があるかを先に決めると判断しやすくなります。',action='まずは求人を見る前に、譲れない条件を3つ決めておきましょう。';
    if(expert>=4){type='専門性活用タイプ';title='製造業の経験を活かした条件アップを比較する価値があります';desc='生産技術・品質・設計・保全などの経験は、会社が変わっても評価される可能性があります。異業種へ移る前に、同じ製造業内で年収・勤務地・働き方が改善する求人があるか確認してみるのが現実的です。';action='同業・メーカー系求人で、自分の経験がどの条件で評価されるか確認してみましょう。';}
    else if(night>=3){type='働き方改善タイプ';title='「夜勤をなくす」を軸に転職条件を組み直す価値があります';desc='仕事内容そのものより、夜勤やシフトが負担になっている可能性があります。製造経験を捨てず、日勤中心・品質・生産管理などへの横移動も比較候補になります。';action='年収だけでなく「夜勤回数」「休日」「交替勤務の有無」をセットで比較しましょう。';}
    else if(score>=68||intent==='soon'){type='転職比較タイプ';title='現職を続ける場合と転職する場合を、条件で比較する段階です';desc='不満が複数重なっているため、「辞める・辞めない」の二択ではなく、同じ職種で会社だけ変えるケースと、職種を変えるケースを並べて考えるのがおすすめです。';action='求人票を3〜5件だけ見て、今の職場より改善する項目が何個あるか確認してください。';}

    document.getElementById('score').textContent=`${score}%`;document.getElementById('resultType').textContent=type;document.getElementById('resultTitle').textContent=title;document.getElementById('resultDesc').textContent=desc;document.getElementById('resultAction').textContent=action;

    let guide='articles/factory-quit.html',guideText='工場勤務を辞めたい人の判断軸を読む';
    if(night>=2||change==='worktime'){guide='articles/night-shift-hard.html';guideText='夜勤・勤務時間の転職条件を読む';}
    if(change==='salary'){guide='articles/manufacturing-500-income.html';guideText='年収アップの条件を読む';}
    const roleGuides={
      'production-tech':['articles/production-tech-career.html','生産技術の転職条件を読む'],
      'quality':['articles/quality-quit.html','品質経験を活かす転職先を読む'],
      'mechanical':['articles/machine-design-career.html','機械設計の転職条件を読む'],
      'electrical':['articles/electrical-design-career.html','電気・制御設計の転職条件を読む'],
      'maintenance':['articles/maintenance-career.html','設備保全の転職条件を読む'],
      'period':['articles/period-worker-next.html','期間工のその後の進路を読む']
    };
    if(roleGuides[job]&&change!=='worktime') [guide,guideText]=roleGuides[job];
    if(change==='salary'&&['production-tech','quality','mechanical','electrical','maintenance'].includes(job)){
      guide='articles/manufacturing-500-income.html';guideText='専門性を活かした年収アップ条件を読む';
    }
    if(change==='work'&&job==='other'){guide='articles/manufacturing-other-industry.html';guideText='製造業から異業種への進み方を読む';}

    const ctaRow=result.querySelector('.cta-row');
    if(ctaRow&&!result.querySelector('[data-result-guide]')){const a=document.createElement('a');a.className='btn btn-primary';a.href=guide;a.textContent=guideText;a.dataset.resultGuide='';ctaRow.prepend(a);}

    if(ctaRow&&!result.querySelector('[data-result-service-guide]')&&intent!=='stay'){
      const a=document.createElement('a');a.className='btn btn-secondary';a.href='articles/manufacturing-agent-guide.html';a.textContent='転職サービスの選び方を見る';a.dataset.resultServiceGuide='';ctaRow.insertBefore(a,ctaRow.lastElementChild);
    }

    const programs=window.SITE_CONFIG?.affiliatePrograms||{};
    let preferred=['makersJob'];
    const specialistJobs=['production-tech','quality','mechanical','electrical','maintenance'];
    if(specialistJobs.includes(job)||expert>=4||(income==='500'||income==='600')) preferred=['samuraiJob','makersJob'];
    else if(change==='work'&&job==='other') preferred=['magicari','makersJob'];
    else if(intent==='soon'&&change==='people') preferred=['makersJob','zen'];
    const available=preferred.map(k=>[k,programs[k]]).filter(([,p])=>p&&String(p.url||'').trim());
    const pr=document.getElementById('prBox');
    if(available.length){
      pr.style.display='block';
      pr.innerHTML='<span class="pr-label">PR</span><h3>条件に近い支援サービス</h3><p>診断回答から、比較しやすい順に表示しています。対象者・サービス内容はリンク先の最新情報を確認してください。</p><div class="diag-offers"></div>';
      const wrap=pr.querySelector('.diag-offers');
      available.forEach(([key,p],i)=>{
        const a=document.createElement('a');
        a.className='btn '+(i===0?'btn-primary':'btn-secondary');
        a.href=p.url;
        a.target='_blank';
        a.rel='sponsored nofollow noopener';
        a.referrerPolicy=p.referrerPolicy||'no-referrer-when-downgrade';
        a.textContent=p.name+'を確認する';
        a.addEventListener('click',()=>window.trackSiteEvent?.('affiliate_click',{program:key,page:'diagnosis',placement:'diagnosis_result',result_type:type,job}));
        wrap.appendChild(a);

        const pixel=String(p.impressionPixel||'').trim();
        if(pixel){
          const img=document.createElement('img');
          img.src=pixel;img.width=1;img.height=1;img.alt='';img.decoding='async';
          img.referrerPolicy=p.referrerPolicy||'no-referrer-when-downgrade';
          img.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;';
          pr.appendChild(img);
        }
      });
    }else pr.style.display='none';

    window.trackSiteEvent?.('diagnosis_complete',{score,result_type:type,job,change,intent,guide});
    shell.style.display='none';result.classList.add('active');window.scrollTo({top:0,behavior:'smooth'});
  }
  render();
})();
