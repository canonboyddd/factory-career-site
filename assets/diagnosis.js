(() => {
  const questions = [...document.querySelectorAll('.question')];
  const progress = document.querySelector('.diag-progress span');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const result = document.getElementById('resultBox');
  const shell = document.getElementById('questionArea');
  let current = 0;
  const answers = {};

  const render = () => {
    questions.forEach((q,i)=>q.classList.toggle('active',i===current));
    progress.style.width = `${((current+1)/questions.length)*100}%`;
    prevBtn.style.visibility = current===0 ? 'hidden':'visible';
    nextBtn.textContent = current===questions.length-1 ? '結果を見る':'次へ';
    const selected = questions[current].querySelector('.choice.selected');
    nextBtn.disabled = !selected;
  };

  questions.forEach((q,index)=>{
    q.querySelectorAll('.choice').forEach(btn=>{
      btn.addEventListener('click',()=>{
        q.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected'));
        btn.classList.add('selected');
        answers[q.dataset.key] = {
          value: btn.dataset.value,
          score: Number(btn.dataset.score||0),
          expert: Number(btn.dataset.expert||0),
          night: Number(btn.dataset.night||0)
        };
        nextBtn.disabled = false;
      });
    });
  });

  prevBtn.addEventListener('click',()=>{ if(current>0){current--;render();} });
  nextBtn.addEventListener('click',()=>{
    if(!answers[questions[current].dataset.key]) return;
    if(current < questions.length-1){current++;render();return;}
    showResult();
  });

  function showResult(){
    let raw = 0, expert = 0, night = 0;
    Object.values(answers).forEach(a=>{raw+=a.score;expert+=a.expert;night+=a.night;});
    const score = Math.max(24,Math.min(92,Math.round(42 + raw*4.2)));
    const job = answers.job?.value || '';
    const intent = answers.intent?.value || '';
    let type = '情報整理タイプ';
    let title = '今すぐ辞めるより、条件整理から始める段階です';
    let desc = '転職を急ぐ必要はありません。今の不満を「年収・勤務時間・仕事内容・人間関係」に分け、どの条件なら転職する価値があるかを先に決めると判断しやすくなります。';
    let action = 'まずは求人を見る前に、譲れない条件を3つ決めておきましょう。';
    let serviceFit = false;

    if(expert >= 4){
      type = '専門性活用タイプ';
      title = '製造業の経験を活かした条件アップを比較する価値があります';
      desc = '生産技術・品質・設計・保全などの経験は、会社が変わっても評価される可能性があります。異業種へ移る前に、同じ製造業内で年収・勤務地・働き方が改善する求人があるか確認してみるのが現実的です。';
      action = '同業・メーカー系求人で、自分の経験がどの条件で評価されるか確認してみましょう。';
      serviceFit = true;
    } else if(night >= 3){
      type = '働き方改善タイプ';
      title = '「夜勤をなくす」を軸に転職条件を組み直す価値があります';
      desc = '仕事内容そのものより、夜勤やシフトが負担になっている可能性があります。製造経験を捨てず、日勤中心・設備保全・品質・生産管理などへの横移動も比較候補になります。';
      action = '年収だけでなく「夜勤回数」「年間休日」「交替勤務の有無」をセットで比較しましょう。';
      serviceFit = expert >= 2;
    } else if(score >= 68 || intent === 'soon'){
      type = '転職比較タイプ';
      title = '現職を続ける場合と転職する場合を、条件で比較する段階です';
      desc = '不満が複数重なっているため、「辞める・辞めない」の二択ではなく、同じ職種で会社だけ変えるケースと、職種を変えるケースを並べて考えるのがおすすめです。';
      action = '求人票を3〜5件だけ見て、今の職場より改善する項目が何個あるか確認してください。';
      serviceFit = ['production-tech','quality','mechanical','electrical','maintenance'].includes(job);
    }

    document.getElementById('score').textContent = `${score}%`;
    document.getElementById('resultType').textContent = type;
    document.getElementById('resultTitle').textContent = title;
    document.getElementById('resultDesc').textContent = desc;
    document.getElementById('resultAction').textContent = action;

    const pr = document.getElementById('prBox');
    const cta = document.getElementById('resultCta');
    if(serviceFit){
      pr.style.display = 'block';
      cta.textContent = '自分の経験で応募できる求人を確認する';
      const url = window.SITE_CONFIG?.affiliateUrl || '';
      cta.href = url || '#link-setting';
      if(url){ cta.target='_blank'; cta.rel='sponsored nofollow noopener'; }
      else { cta.addEventListener('click',e=>{e.preventDefault();alert('assets/config.js の affiliateUrl にA8の広告リンクを設定すると、このボタンから遷移できます。');},{once:false}); }
    } else {
      pr.style.display = 'none';
    }

    shell.style.display = 'none';
    result.classList.add('active');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  render();
})();
