/* =====================================================================
   CONTENT FILE — edit everything about your website here.
   ---------------------------------------------------------------------
   • You never need to touch the HTML/CSS to update the site.
   • Lines marked  TODO  are placeholders waiting for your real data.
   • Images go in  assets/images/  and are referenced like
       "assets/images/your-photo.jpg"
   • To hide a section completely, make its list empty:  []
   • Text fields accept simple HTML, e.g. <em>, <strong>, <a href="">.
   ===================================================================== */

window.SITE = {

  /* ---------- Basic info (used in header, footer, page titles) ---------- */
  meta: {
    firstName: "Paras",
    lastName: "Shirvale",
    tagline: "Engineer · Musician · Actor · Writer",
    description: "Paras Shirvale — engineering student at IIT Gandhinagar working across machine learning, robotics and software, with a life on stage and in music.",
    email: "paras.shirvale@iitgn.ac.in",
    location: "Gandhinagar, India",
    resume: "assets/resume.pdf",          // TODO: put your CV at this path
    available: true,                       // shows the "Open to opportunities" badge
    availableText: "Open to internships & research roles",
  },

  /* ---------- Hero (the first full screen) ---------- */
  hero: {
    greeting: "Namaste — I'm",
    roles: ["Engineer", "ML Builder", "Robotics", "Musician", "Composer", "Stage Actor", "Poet"],
    intro: "B.Tech–M.Tech student at <strong>IIT Gandhinagar</strong>, building with machine learning, robotics and software — and telling stories on stage, in music and in verse.",
    image: "assets/images/profile.jpg",
    imageCaption: "Fig. 01 — Gandhinagar, 2025",
  },

  /* ---------- Big numbers strip (set to [] to hide) ---------- */
  stats: [
    { value: 10, suffix: "+", label: "Projects built" },          // TODO: real numbers
    { value: 3,  suffix: "",  label: "Years at IIT Gandhinagar" },
    { value: 20, suffix: "+", label: "Stage performances" },
    { value: 15, suffix: "+", label: "Songs & compositions" },
  ],

  /* ---------- About ---------- */
  about: {
    heading: "Curious about how things work — and how they <em>feel</em>.",
    paragraphs: [
      "I'm Paras Shirvale, a B.Tech pre-final year student at the Indian Institute of Technology, Gandhinagar. From a young age I've been fascinated by technology and how it can solve real-world problems, which led me to explore software development, machine learning and VLSI design.",
      "Alongside the technical work, I write poetry and prose. Writing is how I express myself — my interests run deep into Indian culture, history and philosophy, and the human emotions of love, compassion and the hunger for living.",
    ],
    facts: [
      { label: "Based in", value: "Gandhinagar, India" },
      { label: "Studying", value: "B.Tech–M.Tech, Mechanical Eng. + Minor in CSE" },
      { label: "Focus", value: "ML · Robotics · Web" },
      { label: "Languages", value: "Marathi · Hindi · English" },   // TODO: confirm
    ],
  },

  /* ---------- Experience timeline (newest first) ----------
     type: "work" | "education" | "research" | "leadership"           */
  experience: [
    {
      period: "2024",                                   // TODO: exact dates
      role: "Data Science Trainee & Intern",
      org: "Corizo",
      type: "work",
      points: [
        "TODO: what you built / analysed.",
        "TODO: a measurable result.",
      ],
      link: "",
    },
    {
      period: "2023 — Present",
      role: "B.Tech–M.Tech, Mechanical Engineering (Minor in CSE)",
      org: "Indian Institute of Technology, Gandhinagar",
      type: "education",
      points: [
        "Coursework: Data Structures & Algorithms, Machine Learning, Introduction to Robotics.",
        "TODO: CPI / clubs / positions of responsibility.",
      ],
      link: "https://iitgn.ac.in",
    },
  ],

  /* ---------- Projects ----------
     featured: true  → appears on the home page (keep 3–6 featured)
     category: used for the filter buttons on the Projects page          */
  projects: [
    {
      title: "MLP-Based Next-Word Text Generator",
      year: "2024",
      category: "Machine Learning",
      tags: ["PyTorch", "NLP", "Streamlit"],
      summary: "An MLP language model that predicts the next words from input text using a custom vocabulary and learned embeddings.",
      image: "assets/images/chatbot.jpg",
      links: { code: "https://github.com/HarshilShah1804/ES335_Assignment_3", live: "" },
      featured: true,
    },
    {
      title: "Electoral Bonds Explorer",
      year: "2024",
      category: "Web",
      tags: ["Flask", "MySQL", "Data Viz"],
      summary: "A Flask–MySQL web app to analyse electoral bond transactions with dynamic search, filtering and visualisations.",
      image: "assets/images/stocks.jpg",
      links: { code: "", live: "" },                          // TODO: correct repo link
      featured: true,
    },
    {
      title: "Habit Tracker Extension",
      year: "2024",
      category: "Web",
      tags: ["JavaScript", "Chrome Extension"],
      summary: "A browser extension that tracks daily usage and streaks on chosen websites and nudges you with reminders.",
      image: "assets/images/quiz.jpg",
      links: { code: "", live: "" },                          // TODO
      featured: true,
    },
    {
      title: "Personal Portfolio",
      year: "2025",
      category: "Web",
      tags: ["HTML", "CSS", "JavaScript"],
      summary: "This website — a content-driven portfolio with light/dark themes, a writing archive and a photo gallery.",
      image: "assets/images/port.jpg",
      links: { code: "https://github.com/Paras-Shirvale/Paras-Shirvale.github.io", live: "https://paras-shirvale.github.io" },
      featured: false,
    },
    {
      title: "TODO: Robotics project",
      year: "2025",
      category: "Robotics",
      tags: ["ROS", "Python"],
      summary: "TODO: one or two lines on the problem, your approach and the result.",
      image: "assets/images/ml_dashboard.png",
      links: { code: "", live: "" },
      featured: false,
    },
  ],

  /* ---------- Skills (grouped) ---------- */
  skills: [
    { group: "Languages", items: ["Python", "C / C++", "JavaScript", "HTML & CSS", "SQL"] },
    { group: "Machine Learning", items: ["PyTorch", "TensorFlow", "Keras", "Scikit-learn", "NumPy", "Pandas"] },
    { group: "Web & Backend", items: ["React", "Node.js", "Flask", "Django", "MySQL"] },
    { group: "Tools & Hardware", items: ["Git", "Docker", "Kubernetes", "Xilinx Vivado", "Cadence"] },
  ],

  certifications: [
    { title: "Machine Learning Specialization", issuer: "Stanford University · Coursera", year: "", link: "" },
    { title: "Data Structures & Algorithms", issuer: "IIT Gandhinagar", year: "", link: "" },
    { title: "Machine Learning", issuer: "IIT Gandhinagar", year: "", link: "" },
    { title: "Introduction to Robotics", issuer: "IIT Gandhinagar", year: "", link: "" },
  ],

  /* ---------- Beyond engineering (music, theatre, writing…) ---------- */
  passions: [
    {
      kicker: "Music",
      title: "Singer · Composer",
      text: "TODO: what you sing, compose, perform — bands, albums, shows.",
      image: "assets/images/photo1.jpg",
      link: { label: "Listen on YouTube", url: "https://www.youtube.com/@parasshirvale" },
    },
    {
      kicker: "Theatre",
      title: "Stage Actor",
      text: "TODO: plays, roles, festivals, the theatre group you're part of.",
      image: "assets/images/photo2.jpg",
      link: null,
    },
    {
      kicker: "Writing",
      title: "Poet · Writer",
      text: "Poetry and prose on Indian culture, history, philosophy — and the emotions that make us human.",
      image: "assets/images/photo3.jpeg",
      link: { label: "Read my writing", url: "writing.html" },
    },
  ],

  /* ---------- Photo gallery ---------- */
  gallery: [
    { src: "assets/images/photo1.jpg", caption: "TODO: caption", place: "TODO: place" },
    { src: "assets/images/photo2.jpg", caption: "TODO: caption", place: "" },
    { src: "assets/images/photo3.jpeg", caption: "TODO: caption", place: "" },
    { src: "assets/images/travel.avif", caption: "TODO: caption", place: "" },
    { src: "assets/images/blog.jpg", caption: "TODO: caption", place: "" },
  ],

  /* ---------- Writing / blog ----------
     Each post opens at  writing.html?p=<slug>
     body: HTML string — use <p>, <h2>, <blockquote>, <img>, etc.        */
  posts: [
    {
      slug: "learning-web-development",
      title: "How I Learned Web Development",
      date: "2025-01-10",
      tags: ["Tech", "Journey"],
      excerpt: "My journey into the world of web development, with tips for beginners.",
      cover: "assets/images/port.jpg",
      body: `
        <p>TODO: write your post here.</p>
        <h2>A sub-heading</h2>
        <p>More paragraphs…</p>
        <blockquote>A line worth highlighting.</blockquote>
      `,
    },
    {
      slug: "lessons-from-ml-models",
      title: "5 Lessons from Building ML Models",
      date: "2024-11-02",
      tags: ["Machine Learning"],
      excerpt: "Insights and challenges from developing machine learning models.",
      cover: "assets/images/ml_dashboard.png",
      body: `<p>TODO</p>`,
    },
    {
      slug: "a-poem",
      title: "TODO: Title of a poem",
      date: "2024-08-15",
      tags: ["Poetry"],
      excerpt: "TODO: first line of the poem…",
      cover: "",
      body: `<p class="poem">TODO: line one<br>line two<br>line three</p>`,
    },
  ],

  /* ---------- Favourite quotes (rotate automatically) ---------- */
  quotes: [
    { text: "If you don't fight for what you want, then don't cry for what you lost. Nothing depends on luck, everything depends on work — because even luck has to work.", author: "Lord Shree Krishna", source: "Shrimad Bhagavad Gita" },
    { text: "Don't let the noise of others' opinions drown out your own inner voice.", author: "Steve Jobs", source: "" },
    { text: "The one who loves his mother language and culture can love any other language and culture.", author: "P. L. Deshpande", source: "" },
  ],

  /* ---------- Contact ----------
     formEndpoint: create a free form at https://formspree.io and paste the
     URL here (e.g. "https://formspree.io/f/abcdwxyz"). If left empty, the
     form opens the visitor's email app instead.                           */
  contact: {
    heading: "Let's build something <em>together</em>.",
    text: "Whether it's a project, a research idea, a collaboration on stage or just a conversation — my inbox is open.",
    formEndpoint: "",
  },

  /* icon: github | linkedin | instagram | youtube | x | mail | medium | spotify */
  socials: [
    { name: "GitHub", url: "https://github.com/Paras-Shirvale", icon: "github" },
    { name: "LinkedIn", url: "https://www.linkedin.com/in/paras-shirvale", icon: "linkedin" },
    { name: "Instagram", url: "https://www.instagram.com/1_parass", icon: "instagram" },
    { name: "YouTube", url: "https://www.youtube.com/@parasshirvale", icon: "youtube" },
  ],

  footer: {
    credit: "Designed & built by Paras Shirvale.",
  },
};
