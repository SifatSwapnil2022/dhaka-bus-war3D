/* ---------- ads and painted signs ---------- */
const AD_TEXT = [
  ['একটি দুর্ঘটনা, সারা জীবনের কান্না', 'সাবধানে গাড়ি চালান', '#c8102e', '#fff'],
  ['এইচএসসি ব্যাচে ভর্তি চলছে', 'সীমিত আসন · আজই যোগাযোগ করুন', '#1f4fa3', '#fff'],
  ['টু-লেট · ফ্ল্যাট ভাড়া হবে', '৩ বেড · ২ বাথ · লিফট আছে', '#f4f1ea', '#c8102e'],
  ['নতুন মোবাইল প্যাকেজ', '৪৯ টাকায় ৫ জিবি · ৭ দিন', '#7a1f8f', '#fff'],
  ['পরিষ্কার শহর, সুন্দর ঢাকা', 'যেখানে সেখানে ময়লা ফেলবেন না', '#0a7d5a', '#fff'],
  ['ঢাকার রাজা', 'শীঘ্রই আসছে আপনার প্রিয় সিনেমা হলে', '#e45a1c', '#fff'],
];
const AD_CACHE = {};
function adTex(i){
  if (AD_CACHE[i]) return AD_CACHE[i];
  const [a, b, bg, fg] = AD_TEXT[i % AD_TEXT.length]; const c = makeCanvas(512, 112), g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 112); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFill(g, a, 256, 42, 480, 700, 40, HS); g.globalAlpha = .9; fitFill(g, b, 256, 88, 470, 600, 20, HS); g.globalAlpha = 1;
  return (AD_CACHE[i] = texFrom(c));
}
function posterTex(){
  const c = makeCanvas(512, 256), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 512, 256); gr.addColorStop(0, '#f2b01e'); gr.addColorStop(.5, '#e45a1c'); gr.addColorStop(1, '#7a1f8f'); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  const face = (x, y, r, hair, skin) => { g.fillStyle = hair; g.beginPath(); g.ellipse(x, y - r * .25, r * 1.08, r * 1.1, 0, 0, 7); g.fill(); g.fillStyle = skin; g.beginPath(); g.ellipse(x, y, r * .82, r, 0, 0, 7); g.fill(); g.fillStyle = '#2a1a10'; g.fillRect(x - r * .4, y - r * .15, r * .22, r * .08); g.fillRect(x + r * .18, y - r * .15, r * .22, r * .08); g.fillStyle = '#b3262f'; g.fillRect(x - r * .2, y + r * .45, r * .4, r * .08); };
  face(140, 120, 70, '#1b1110', '#d9a07a'); face(370, 110, 62, '#2a1714', '#e8b48e');
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 186, 512, 70);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 64px ${HS}`; strokeFill(g, 'ঢাকার রাজা', 256, 214, '#fff35e', '#a3121b', 8);
  return texFrom(c);
}
function signAtlas(){
  const c = makeCanvas(1024, 512), g = c.getContext('2d');
  const names = ['মায়ের দোয়া স্টোর', 'নিউ বিসমিল্লাহ হোটেল', 'জননী ফার্মেসী', 'ভাই ভাই টেলিকম', 'আল-মদিনা টেইলার্স', 'সোনার বাংলা ইলেকট্রনিক্স', 'বাংলা চা ঘর', 'কাচ্চি হাউস', 'নূর অপটিক্স', 'রূপসী বিউটি পার্লার', 'মডার্ন হেয়ার কাটিং', 'ঢাকা হার্ডওয়্যার', 'তাজ সুইটস', 'চটপটি ফুচকা কর্নার', 'আদর্শ লাইব্রেরি', 'রহমানিয়া ভ্যারাইটিজ'];
  const tags = ['এখানে মোবাইল রিচার্জ করা হয়', 'সুলভ মূল্যে', 'অর্ডার নেওয়া হয়', '২৪ ঘণ্টা খোলা', 'সব ধরনের মাল পাওয়া যায়', 'প্রোঃ হাজী আব্দুল করিম'];
  const bgs = [['#c8102e', '#fff'], ['#0a7d5a', '#fff'], ['#f2b01e', '#2a1a08'], ['#1f4fa3', '#fff'], ['#7a1f8f', '#fff'], ['#e45a1c', '#fff'], ['#1b1b1b', '#f2b01e'], ['#0e7c86', '#fff']];
  for (let i = 0; i < 16; i++) {
    const x = (i % 4) * 256, y = Math.floor(i / 4) * 128; const [bg, ink] = bgs[i % bgs.length];
    g.fillStyle = bg; g.fillRect(x, y, 256, 128); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 4; g.strokeRect(x + 6, y + 6, 244, 116);
    g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle'; fitFill(g, names[i], x + 128, y + 54, 228, 700, 40, HS);
    g.globalAlpha = .85; fitFill(g, tags[i % tags.length], x + 128, y + 98, 220, 500, 19, HS); g.globalAlpha = 1;
    wearPass(g, .35, 256, 128);
  }
  return texFrom(c);
}
function toLetTex(){ const c = makeCanvas(128, 96), g = c.getContext('2d'); g.fillStyle = '#f7f5ef'; g.fillRect(0, 0, 128, 96); g.fillStyle = '#c8102e'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 34px ${HS}`; g.fillText('টু-লেট', 64, 38); g.font = `600 15px ${HS}`; g.fillText('বাসা ভাড়া হবে', 64, 74); return texFrom(c); }

