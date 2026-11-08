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
    tagline: "Physical AI · Robotics · Music · Theatre",
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
    roles: ["Physical AI", "Robot Manipulation", "Dynamical Systems", "Robot Learning", "Musician", "Stage Actor"],
    intro: "B.Tech–M.Tech student at <strong>IIT Gandhinagar</strong> working on <strong>Physical AI</strong> — teaching robot hands to coordinate, make contact and manipulate the real world with dexterity.",
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
    heading: "Intelligence that doesn't just think — it <em>touches</em>, moves and adapts.",
    paragraphs: [
      "I'm Paras Shirvale, a B.Tech–M.Tech student at the Indian Institute of Technology, Gandhinagar, working at the intersection of robotics, control and machine learning — what's now called <strong>Physical AI</strong>.",
      "Language models have learned to reason about the world; the next frontier is acting in it. Robots must handle objects they've never seen, make and break contact gracefully, and stay safe around people. I'm drawn to the hardest version of that problem: <strong>dexterous, contact-rich manipulation</strong> with multi-fingered hands.",
      "My approach pairs principled control — dynamical systems, optimisation and contact mechanics — with perception and learning, so that robot behaviour is both adaptive and provably well-behaved. I build in simulation (MuJoCo) and take it to real hardware: the LEAP Hand, the Franka FR3 and RGB-D vision.",
    ],
    facts: [
      { label: "Based in", value: "Gandhinagar, India" },
      { label: "Studying", value: "B.Tech–M.Tech, Mechanical Eng. + Minor in CSE" },
      { label: "Field", value: "Physical AI · Robot manipulation" },
      { label: "Currently", value: "In-hand manipulation on the LEAP Hand" },
    ],
  },

  /* ---------- Research ----------
     interests: short chips shown above the list
     Each entry: status (e.g. "Under review", "Manuscript · ICRA 2027"),
     links: { paper, video, code, website } — empty ones are hidden         */
  research: {
    statement: "I study how robots can manipulate objects with human-like dexterity — combining <em>dynamical systems</em>, <em>contact-aware optimisation</em> and <em>perception</em> so hands can coordinate, adapt and recover in the physical world.",
    interests: ["Physical AI", "Dexterous Manipulation", "Dynamical Systems Control", "Contact-Rich Manipulation", "Human–Robot Interaction", "Robot Learning"],
    entries: [
      {
        title: "Coordinated In-Hand Object Manipulation Using Second-Order Dynamical Systems",
        status: "Manuscript in preparation · targeting ICRA 2027",
        period: "May 2026 — ongoing",
        advisor: "Prof. Harish Palanthandalam-Madapusi",
        lab: "IIT Gandhinagar",
        summary: "A second-order coupled dynamical-systems framework for coordinated multi-finger in-hand object reorientation on the 16-DoF LEAP Hand, with commands generated directly in wrench space.",
        points: [
          "Closed-form Newton–Euler object dynamics to generate desired wrenches for the object.",
          "Full-wrench contact force distribution as a QP with friction-cone constraints; joint torques via the Jacobian transpose.",
          "Time-scaling feasibility governor that keeps commands bounded across contact transitions.",
          "Validated in MuJoCo; deploying on the physical LEAP Hand with joint-level torque control (Dynamixel SDK) and RealSense/ArUco object pose estimation.",
        ],
        tags: ["LEAP Hand", "MuJoCo", "QP", "Dynamixel SDK", "RealSense", "ArUco"],
        image: "",                    // e.g. "assets/images/leap-hand.jpg" or a .gif/.mp4 still
        links: { paper: "", video: "", code: "", website: "" },
      },
    ],
  },

  /* ---------- Experience timeline (newest first) — set to [] to hide ----------
     type: "work" | "internship" | "leadership"                          */
  experience: [],

  /* ---------- Projects ----------
     featured: true  → appears on the home page (keep 3–6 featured)
     category: used for the filter buttons on the Projects page
     with / period: shown under the title (supervisor, dates)
     points: optional bullet highlights
     image: leave "" to show an auto-generated cover tile               */
  projects: [
    {
      title: "Spark — A Reading Companion for Children with Dyslexia",
      year: "2026",                                           // TODO: confirm
      period: "",                                             // TODO: e.g. "Aug — Nov 2026"
      with: "",                                               // TODO: course / professor
      category: "HCI",
      tags: ["Accessibility", "Web Speech API", "LLMs", "JavaScript", "Adaptive UI"],
      summary: "An AI reading companion for children aged 9–14 with dyslexia. Spark listens while the child reads aloud, notices where they get stuck, and learns which kind of help works for that child — a picture, hearing the word, or breaking it into parts.",
      points: [
        "Live speech-to-text alignment that follows the reader word-by-word and classifies pauses as ordinary phrasing or real difficulty.",
        "Detects letter confusions (b/d, p/q, m/w, reversals like was/saw) and builds personalised homework from the exact words a child struggled with.",
        "Adaptive cue engine, dyslexia-friendly typography (OpenDyslexic) and an LLM-powered “Ask Spark” chat with child-safe guardrails — all data stays on the device.",
      ],
      image: "assets/images/spark.png",
      links: { code: "", live: "projects/HCI_project/" },
      featured: true,
    },
    {
      title: "Vision-Guided Human-to-Robot Handover",
      year: "2026",
      period: "Feb — Apr 2026",
      with: "Prof. Harish Palanthandalam-Madapusi",
      category: "Robotics",
      tags: ["ROS 2", "YOLO", "MediaPipe", "RealSense", "MuJoCo", "IK"],
      summary: "A real-time, grasp-aware handover pipeline: the robot finds a cup and the human's fingers in RGB-D, then grasps the cup at the point farthest from the human's hand.",
      points: [
        "YOLO26l cup detection + MediaPipe fingertip localisation, back-projected to 3D with aligned depth.",
        "Grasp-aware target selection along the cup's vertical axis, streamed live to the robot base frame as a PointStamped target.",
        "Safety logic (height-based activation, hold on detection loss) and DLS inverse kinematics in MuJoCo for pick-place and handover-to-place.",
      ],
      image: "",
      links: { code: "", live: "" },                          // TODO: Project Link
      featured: true,
    },
    {
      title: "MDP-Based Pick and Place",
      year: "2025",
      period: "Dec 2025 — Feb 2026",
      with: "Prof. Harish Palanthandalam-Madapusi",
      category: "Robotics",
      tags: ["MDP", "Dynamic Programming", "Value Iteration"],
      summary: "Robotic pick-and-place formulated as a Markov Decision Process — with a designed state space, action space and reward — and solved with value iteration.",
      image: "",
      links: { code: "", live: "" },                          // TODO: Project Link
      featured: true,
    },
    {
      title: "MLP-Based Next-Word Text Generator",
      year: "2024",
      period: "Aug — Nov 2024",
      with: "Prof. Nipun Batra",
      category: "Machine Learning",
      tags: ["PyTorch", "NLP", "t-SNE", "Streamlit"],
      summary: "An MLP language model over an 8K-word custom vocabulary that generates the next words from input text, with an interactive Streamlit app.",
      points: [
        "Trained for 1000 epochs with embedding and hidden layers of up to 1024 units; t-SNE plots reveal semantic clusters (verbs, names, antonyms).",
        "Streamlit app with controls for context length, embedding size, activation and prediction length, comparing 3 pre-trained variants.",
      ],
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
      featured: false,
    },
    {
      title: "Habit Tracker Extension",
      year: "2024",
      category: "Web",
      tags: ["JavaScript", "Chrome Extension"],
      summary: "A browser extension that tracks daily usage and streaks on chosen websites and nudges you with reminders.",
      image: "assets/images/quiz.jpg",
      links: { code: "", live: "" },                          // TODO
      featured: false,
    },
  ],

  /* ---------- Skills (grouped) ---------- */
  skills: [
    { group: "Languages", items: ["Python", "C++", "C", "MATLAB", "SQL", "JavaScript", "HTML", "CSS"] },
    { group: "Libraries", items: ["NumPy", "Pandas", "Matplotlib", "Seaborn", "scikit-learn", "PyTorch", "TensorFlow", "OpenCV", "MediaPipe"] },
    { group: "Frameworks", items: ["ROS 2", "ROS Noetic", "Flask", "Streamlit"] },
    { group: "Robotics & Simulation", items: ["MuJoCo", "OpenSim", "KDL", "Dynamixel SDK", "Intel RealSense", "ArUco"] },
    { group: "Hardware", items: ["LEAP Hand", "Franka FR3", "HEAL Arm"] },
    { group: "Development Tools", items: ["Jupyter Notebook", "Google Colab", "Git & GitHub", "Linux", "LaTeX"] },
    { group: "CAD & Analysis", items: ["Autodesk Inventor", "Autodesk Fusion", "MSC ADAMS", "ANSYS"] },
  ],

  certifications: [
    { title: "Machine Learning Specialization", issuer: "Stanford University · Coursera", year: "", link: "" },
    { title: "Data Structures & Algorithms", issuer: "IIT Gandhinagar", year: "", link: "" },
    { title: "Machine Learning", issuer: "IIT Gandhinagar", year: "", link: "" },
    { title: "Introduction to Robotics", issuer: "IIT Gandhinagar", year: "", link: "" },
  ],

  /* ---------- Beyond engineering (music, theatre…) ---------- */
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
  ],

  /* ---------- Photo gallery ---------- */
  gallery: [
    { src: "assets/images/photo1.jpg", caption: "TODO: caption", place: "TODO: place" },
    { src: "assets/images/photo2.jpg", caption: "TODO: caption", place: "" },
    { src: "assets/images/photo3.jpeg", caption: "TODO: caption", place: "" },
    { src: "assets/images/travel.avif", caption: "TODO: caption", place: "" },
    { src: "assets/images/blog.jpg", caption: "TODO: caption", place: "" },
  ],

  /* ---------- Favourite quotes (rotate automatically) ---------- */
  quotes: [
    { text: "If you don't fight for what you want, then don't cry for what you lost. Nothing depends on luck, everything depends on work — because even luck has to work.", author: "Lord Shree Krishna", source: "Shrimad Bhagavad Gita" },
    { text: "Don't let the noise of others' opinions drown out your own inner voice.", author: "Steve Jobs", source: "" },
    { text: "We become what we think about most of the time — and that's the strangest secret.", author: "Earl Nightingale", source: "The Strangest Secret" },
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
