export interface IntakeQuestion {
  id:          string
  text:        string
  type:        'textarea' | 'text' | 'select' | 'multiselect' | 'date' | 'time' | 'number'
  placeholder?: string
  options?:    string[]
  required?:   boolean
  source?:     string[]                 // v1 IDs this question replaces (versioned forms only)
  revision?:   'merged' | 'revised'
  match?:      'direct' | 'partial'     // how closely the question follows its source (Loving By Design v2)
  draftTag?:   string                   // provenance tag as supplied with the draft (Loving By Design v2)
  detail?:     IntakeQuestion           // second field answered on the same screen
  note?:       string                   // guidance shown beneath the question
  allowDecline?: boolean                // offers PREFER_NOT_TO_DISCLOSE as an answer
}

export interface IntakeSection {
  title:       string
  description?: string
  association?: string                  // internal only; never shown to the customer
  questions:   IntakeQuestion[]
}

export const RELATIONAL_INTRO = "The accuracy and depth of your relationship report depends on the honesty and specificity of what each person shares here. Your charts show the structural conditions both of you were born into and the energetic dynamics that form between your designs. What the charts cannot show is how those dynamics have actually landed in your lived experience together. The more precisely you describe your real experience of this relationship, not the ideal version, not the version you present publicly, but the one you actually live inside, the more the system can identify where your connection is functioning cleanly, where friction is structural rather than personal, where potential exists that has not yet been realized, and where genuine tension lives between what your charts carry and what your relationship currently reflects. Both partners fill this form independently. Do not consult each other before answering."

export const RELATIONAL_PRODUCT_LINE = "Astrology Synastry · HD Composite"

// Opening line of the supplied Loving By Design v2 questionnaire, shown on both partners' intro screens.
export const RELATIONAL_INDEPENDENT_COMPLETION = "Each partner completes this questionnaire independently, answering from their own experience."

// ─── SELF FORM (Embody My Design) — Products 1, 2, 3, 4 ─────────────────────

export const SELF_QUESTIONNAIRE_VERSION = 'emd-v2'
export const SELF_V1_VERSION            = 'emd-v1'
// Reserved key inside charts.intake_self; set by the server on every save.
export const SELF_VERSION_KEY           = '_questionnaire_version'

export const PREFER_NOT_TO_DISCLOSE = 'Prefer not to disclose'
export const UNKNOWN_NOT_APPLICABLE = 'Unknown / Not applicable'

export const SELF_INTRO = [
  'This questionnaire explores your lived experiences, relationships, emotional patterns, physical awareness, personal history, and current direction. Your responses provide context for your personalized reading.',
  'Answer from your actual experience rather than how you believe you should feel or behave.',
]

const MBTI_TYPES = ['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP', 'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ']
const ENNEAGRAM_TYPES = ['Type 1', 'Type 2', 'Type 3', 'Type 4', 'Type 5', 'Type 6', 'Type 7', 'Type 8', 'Type 9']

// 40 questions in 13 sections. IDs are new (emd2_NN) so no v1 answer is ever
// read against v2 wording; `source` gives the v1 IDs each question replaces,
// and a question with no `source` is new in v2. Every question is required.
// `association` is the internal house mapping and is never rendered.
// allowDecline marks the sensitive questions (owner to confirm the set).
export const SELF_SECTIONS: IntakeSection[] = [
  {
    title: 'SECTION 1 — IDENTITY AND SELF-PERCEPTION',
    association: 'First House',
    questions: [
      { id: 'emd2_01', text: 'How would you describe who you actually are at this moment, rather than who you are working to become? What do you understand about yourself that you feel other people frequently miss, misunderstand, or misread?', type: 'textarea', required: true, source: ['s1', 's2'], revision: 'merged' },
      { id: 'emd2_02', text: 'On a scale of 1 to 10, how aligned does your current life feel with who you believe you truly are? Explain why you chose that number.', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], required: true, source: ['s5'], detail: { id: 'emd2_02_explanation', text: 'Explain why you chose that number.', type: 'textarea', required: true } },
      { id: 'emd2_03', text: 'What is the version of yourself you most fear becoming?', type: 'textarea', required: true, source: ['s13'] },
      { id: 'emd2_04', text: 'What parts of yourself do you tend to override, suppress, or abandon in order to keep things functioning or to keep others comfortable?', type: 'textarea', required: true, source: ['s17'] },
      { id: 'emd2_05', text: 'What have you learned about your natural tendencies, strengths, and limitations? Where do you still experience confusion or resistance in expressing them?', type: 'textarea', required: true, source: ['s18'], revision: 'revised' },
    ],
  },
  {
    title: 'SECTION 2 — VALUES, MONEY, AND SECURITY',
    association: 'Second House',
    questions: [
      { id: 'emd2_06', text: 'What do you value most in how you actually live and organize your life? Which of those values would you be unwilling to compromise, regardless of the personal, relational, or material cost?', type: 'textarea', required: true, source: ['s14', 's15'], revision: 'merged' },
      { id: 'emd2_07', text: 'What positive qualities, strengths, or gifts have you developed through your life experiences?', type: 'textarea', required: true, source: ['s16'], revision: 'revised' },
      { id: 'emd2_08', text: 'What is your relationship with money, material security, and receiving support? What beliefs or experiences most shape how you earn, spend, save, or share resources?', type: 'textarea', required: true, allowDecline: true },
    ],
  },
  {
    title: 'SECTION 3 — MIND, LEARNING, AND COMMUNICATION',
    association: 'Third House',
    questions: [
      { id: 'emd2_09', text: 'How do you currently make significant decisions, and how much do you trust that process? When communicating your needs, thoughts, or feelings, particularly when others may disagree with or misunderstand you, what tends to happen? Where do you experience confidence, hesitation, or difficulty?', type: 'textarea', required: true, source: ['s19'], revision: 'merged' },
    ],
  },
  {
    title: 'SECTION 4 — FAMILY, ORIGINS, AND BELONGING',
    association: 'Fourth House',
    questions: [
      { id: 'emd2_10', text: 'How would you describe your relationship with your mother or primary maternal caregiver, and what lasting influence has that relationship had on you?', type: 'textarea', required: true, allowDecline: true },
      { id: 'emd2_11', text: 'How would you describe your relationship with your father or primary paternal caregiver, and what lasting influence has that relationship had on you?', type: 'textarea', required: true, allowDecline: true },
      { id: 'emd2_12', text: 'What does home and emotional safety mean to you, and how does your current living environment support or challenge that experience? Which beliefs, roles, or patterns surrounding family, security, and belonging do you recognize as inherited, and which have you consciously chosen to retain or change?', type: 'textarea', required: true, revision: 'merged', allowDecline: true },
    ],
  },
  {
    title: 'SECTION 5 — CREATIVITY, JOY, AND UNLIVED POTENTIAL',
    association: 'Fifth House',
    questions: [
      { id: 'emd2_13', text: 'Is there a deep passion, calling, desire, or aspect of yourself that you feel drawn toward but have not fully clarified, explored, or embodied? What has prevented you from pursuing or expressing it?', type: 'textarea', required: true, source: ['s7'], revision: 'merged' },
      { id: 'emd2_14', text: 'What accomplishment, experience, or personal growth are you most proud of, and what helped you achieve it? What activities, experiences, or forms of self-expression currently make you feel most alive, and how much space do you give them in your life?', type: 'textarea', required: true, source: ['s8'], revision: 'merged' },
    ],
  },
  {
    title: 'SECTION 6 — HEALTH, HABITS, AND DAILY RHYTHM',
    association: 'Sixth House',
    questions: [
      { id: 'emd2_15', text: 'When you feel overwhelmed, dysregulated, depleted, or off track, what is your default coping strategy? Across a typical week, what patterns do you notice in your energy, focus, activity, and need for rest? Which habits help you regain balance, and which tend to disrupt it?', type: 'textarea', required: true, source: ['s20'], revision: 'merged' },
      { id: 'emd2_16', text: 'How would you describe your relationship with your physical body and its energy? Do you generally trust its signals, override them, or feel disconnected from them? Where do you most commonly experience stress, tension, discomfort, or other physical sensations associated with your emotional experiences?', type: 'textarea', required: true, source: ['s24', 's25'], revision: 'merged', allowDecline: true },
      { id: 'emd2_17', text: 'Do you experience any recurring physical challenges, such as sleep difficulties, digestive issues, pain, or fatigue? If so, how do they affect your daily life?', type: 'textarea', required: true, source: ['s26'], revision: 'revised', allowDecline: true },
    ],
  },
  {
    title: 'SECTION 7 — RELATIONSHIPS, INTIMACY, AND PROJECTION',
    association: 'Seventh House',
    questions: [
      { id: 'emd2_18', text: 'Describe the most significant relational dynamic in your life right now, romantic or otherwise. What is working, what is challenging, and what recurring patterns within yourself do you recognize across your relationships that you most want to understand or change?', type: 'textarea', required: true, source: ['s21', 's22'], revision: 'merged' },
      { id: 'emd2_19', text: 'How comfortable are you with genuine intimacy and allowing another person to fully know you? What happens when you feel deeply seen, emotionally exposed, or vulnerable? What attachment patterns do you recognize in yourself, and how do they tend to influence your relationships?', type: 'textarea', required: true, source: ['s23', 's36'], revision: 'merged', note: 'If you are unfamiliar with attachment styles, describe your actual experiences rather than selecting a label.', allowDecline: true },
      { id: 'emd2_20', text: 'What qualities or behaviors in other people provoke your strongest admiration or irritation? Have you noticed any of those qualities, needs, or fears in yourself?', type: 'textarea', required: true },
    ],
  },
  {
    title: 'SECTION 8 — SHADOW, ADVERSITY, AND TRANSFORMATION',
    association: 'Eighth House',
    questions: [
      { id: 'emd2_21', text: 'What do you feel are the biggest obstacles currently preventing you from living the life you want? Are there challenges, difficulties, or recurring patterns that continue appearing even when your circumstances change? How do you understand those patterns today?', type: 'textarea', required: true, source: ['s9', 's10', 's12'], revision: 'merged' },
      { id: 'emd2_22', text: 'Where in your life do you experience the greatest friction between who you understand yourself to be internally and how you are currently living externally? When life becomes difficult, uncertain, or overwhelming, what protective behaviors or familiar responses emerge, and how do they differ from the person you understand yourself to be?', type: 'textarea', required: true, source: ['s11'], revision: 'merged' },
      { id: 'emd2_23', text: 'What is currently ending or dying in your life, a chapter, a relationship, an identity, a belief?', type: 'textarea', required: true, source: ['s31'] },
      { id: 'emd2_24', text: 'What significant losses, disappointments, or life transitions have shaped you, and how have those experiences influenced who you are today?', type: 'textarea', required: true, source: ['s32'], revision: 'revised', allowDecline: true },
      { id: 'emd2_25', text: 'What are two or three experiences in your life that most fundamentally changed who you were becoming?', type: 'textarea', required: true, source: ['s30'] },
    ],
  },
  {
    title: 'SECTION 9 — SPIRITUALITY, MEANING, AND WORLDVIEW',
    association: 'Ninth House',
    questions: [
      { id: 'emd2_26', text: 'What spiritual, philosophical, or self-development frameworks have shaped how you understand yourself? What has landed, and what has fallen short?', type: 'textarea', required: true, source: ['s27'] },
      { id: 'emd2_27', text: 'How would you describe your relationship to something larger than yourself, a practice, a philosophy, a knowing, or an absence of one?', type: 'textarea', required: true, source: ['s28'] },
      { id: 'emd2_28', text: 'What spiritual or philosophical question most occupies you right now?', type: 'textarea', required: true, source: ['s29'] },
    ],
  },
  {
    title: 'SECTION 10 — VOCATION, CONTRIBUTION, AND AUTHORITY',
    association: 'Tenth House',
    questions: [
      { id: 'emd2_29', text: 'Do you have a sense of what you are here to contribute? If yes, describe it. If no, describe what that uncertainty feels like.', type: 'textarea', required: true, source: ['s6'] },
      { id: 'emd2_30', text: 'What is your current relationship with work, career, or vocation? Where do you experience fulfillment, pressure, stagnation, or a desire for change?', type: 'textarea', required: true },
      { id: 'emd2_31', text: 'How do you typically respond to authority, expectations, or situations where someone else attempts to direct your choices? What experiences have shaped that response?', type: 'textarea', required: true },
    ],
  },
  {
    title: 'SECTION 11 — COMMUNITY, ASPIRATIONS, AND FUTURE DIRECTION',
    association: 'Eleventh House',
    questions: [
      { id: 'emd2_32', text: 'Where do you experience genuine belonging, and where do you find yourself adapting or compromising who you are to remain accepted?', type: 'textarea', required: true },
      { id: 'emd2_33', text: 'What does a life that feels genuinely yours look like? Describe it concretely, including how you would live, relate, work, and express yourself. What would need to change internally for that life to become possible?', type: 'textarea', required: true, source: ['s33', 's34'], revision: 'merged' },
      { id: 'emd2_34', text: 'What qualities, values, or contributions do you most want to pass on or leave behind?', type: 'textarea', required: true },
    ],
  },
  {
    title: 'SECTION 12 — SOLITUDE, UNCONSCIOUS PATTERNS, AND SURRENDER',
    association: 'Twelfth House',
    questions: [
      { id: 'emd2_35', text: 'When you are alone with yourself, without distractions, responsibilities, or anyone else’s expectations, what tends to emerge? Are there thoughts, feelings, desires, or fears you find yourself avoiding, escaping, or struggling to surrender to?', type: 'textarea', required: true },
    ],
  },
  {
    title: 'SECTION 13 — YOUR FOCUS AND FINAL CONTEXT',
    questions: [
      { id: 'emd2_36', text: 'What brings you here right now? Please elaborate in as much detail as you feel called to share.', type: 'textarea', required: true, source: ['s3'] },
      { id: 'emd2_37', text: 'Is there a specific area of life you want focused on: love, relationships, family, money, career, purpose, karma, dharma, or other? If so, why?', type: 'multiselect', options: ['love', 'relationships', 'family', 'money', 'career', 'purpose', 'karma', 'dharma', 'other'], required: true, source: ['s4'], revision: 'revised', detail: { id: 'emd2_37_explanation', text: 'If so, why?', type: 'textarea', required: true } },
      { id: 'emd2_38', text: 'What do you hope to receive or experience from this reading? Is there anything important you feel has not been asked?', type: 'textarea', required: true, source: ['s35'] },
      { id: 'emd2_39', text: 'What is your Myers-Briggs type?', type: 'text', options: [...MBTI_TYPES, UNKNOWN_NOT_APPLICABLE], required: true, source: ['s37'] },
      { id: 'emd2_40', text: 'What is your Enneagram type?', type: 'text', options: [...ENNEAGRAM_TYPES, UNKNOWN_NOT_APPLICABLE], required: true, source: ['s38'] },
    ],
  },
]

// The 38-question form, kept unchanged as the record for intakes answered under it.
export const SELF_SECTIONS_V1: IntakeSection[] = [
  {
    title: 'WHO YOU ARE RIGHT NOW',
    questions: [
      { id: 's1',  text: 'Describe yourself, not who you are working to become, but who you actually are at this moment.',                                                                        type: 'textarea', required: true },
      { id: 's2',  text: 'What do you understand about yourself that you feel most people miss or misread?',                                                                                       type: 'textarea', required: true },
      { id: 's3',  text: 'What brings you here right now? Please elaborate in as much detail as you feel called to share.',                                                                        type: 'textarea', required: true },
      { id: 's4',  text: 'Is there a specific area of life you want focused on: love, relationships, family, money, career, purpose, karma, dharma, or other? If so, why?',                       type: 'textarea', required: true },
      { id: 's5',  text: 'On a scale of 1 to 10, how aligned does your current life feel with who you believe you truly are? Explain why you chose that number.',                                  type: 'textarea', required: true },
    ],
  },
  {
    title: 'PURPOSE AND VOCATION',
    questions: [
      { id: 's6',  text: 'Do you have a sense of what you are here to contribute? If yes, describe it. If no, describe what that uncertainty feels like.',                                         type: 'textarea', required: true },
      { id: 's7',  text: 'Is there a deep passion, calling, or desire you feel pulled toward but have not fully clarified or embodied yet? This may also be described as dharma.',                 type: 'textarea', required: true },
      { id: 's8',  text: 'What place in your life are you most proud of, and how did you arrive there before your mind justified it?',                                                             type: 'textarea', required: true },
    ],
  },
  {
    title: 'OBSTACLES AND RECURRING PATTERNS',
    questions: [
      { id: 's9',  text: 'What do you feel are the biggest obstacles currently preventing you from living the life you want?',                                                                      type: 'textarea', required: true },
      { id: 's10', text: 'What karma do you believe you carry? Another way to frame this: what challenge, pattern, or difficulty keeps repeating in your life?',                                   type: 'textarea', required: true },
      { id: 's11', text: 'Where in your life do you feel the most friction between who you know yourself to be inside, and how you are currently living externally?',                              type: 'textarea', required: true },
      { id: 's12', text: 'What is the recurring obstacle in your life, the pattern that keeps returning regardless of how much you change around it?',                                             type: 'textarea', required: true },
      { id: 's13', text: 'What is the version of yourself you most fear becoming?',                                                                                                                type: 'textarea', required: true },
    ],
  },
  {
    title: 'VALUES AND WHAT MATTERS',
    questions: [
      { id: 's14', text: 'What do you value most in how you live, what you actually organize your life around?',                                                                                   type: 'textarea', required: true },
      { id: 's15', text: 'What would you be unwilling to compromise regardless of the cost?',                                                                                                      type: 'textarea', required: true },
      { id: 's16', text: 'What do you feel your positive karma is within this lifetime? What have you grown to love?',                                                                             type: 'textarea', required: true },
    ],
  },
  {
    title: 'IDENTITY AND DESIGN',
    questions: [
      { id: 's17', text: 'What parts of yourself do you tend to override, suppress, or abandon in order to keep things functioning or to keep others comfortable?',                                type: 'textarea', required: true },
      { id: 's18', text: 'How have you learned to embody your Human Design type so far? What has worked, and where do you still feel confusion, resistance, or inconsistency?',                    type: 'textarea', required: true },
      { id: 's19', text: 'How do you currently make significant decisions? Do you trust that process, and if not, where does it tend to break down?',                                              type: 'textarea', required: true },
      { id: 's20', text: 'When you feel overwhelmed, dysregulated, or off track, what is your default coping strategy?',                                                                           type: 'textarea', required: true },
    ],
  },
  {
    title: 'RELATIONSHIP AND INTIMACY',
    questions: [
      { id: 's21', text: 'Describe the most significant relational dynamic in your life right now, romantic or otherwise. What is working, what is not, and what pattern do you notice yourself repeating?', type: 'textarea', required: true },
      { id: 's22', text: 'What relational pattern do you find yourself repeating that you most want to understand or change? This is about you, not the type of person you attract.',              type: 'textarea', required: true },
      { id: 's23', text: 'How comfortable are you with genuine intimacy, being fully known by another person, what happens when full 100 percent is on the table?',                                type: 'textarea', required: true },
    ],
  },
  {
    title: 'BODY AND NERVOUS SYSTEM',
    questions: [
      { id: 's24', text: 'How would you describe your relationship with your physical body and your energy? Do you trust it, override it, or feel disconnected from it?',                          type: 'textarea', required: true },
      { id: 's25', text: 'Where do you most commonly feel stress, tension, or discomfort in your body?',                                                                                          type: 'textarea', required: true },
      { id: 's26', text: 'Do you have any chronic physical patterns, sleep, digestion, pain, fatigue, that feel connected to how you are living?',                                                 type: 'textarea', required: true },
    ],
  },
  {
    title: 'SPIRITUALITY AND DEPTH',
    questions: [
      { id: 's27', text: 'What spiritual, philosophical, or self-development frameworks have shaped how you understand yourself? What has landed, and what has fallen short?',                     type: 'textarea', required: true },
      { id: 's28', text: 'How would you describe your relationship to something larger than yourself, a practice, a philosophy, a knowing, or an absence of one?',                                 type: 'textarea', required: true },
      { id: 's29', text: 'What spiritual or philosophical question most occupies you right now?',                                                                                                  type: 'textarea', required: true },
      { id: 's30', text: 'What are two or three experiences in your life that most fundamentally changed who you were becoming?',                                                                   type: 'textarea', required: true },
    ],
  },
  {
    title: 'ENDINGS AND TRANSFORMATION',
    questions: [
      { id: 's31', text: 'What is currently ending or dying in your life, a chapter, a relationship, an identity, a belief?',                                                                      type: 'textarea', required: true },
      { id: 's32', text: 'What have you lost that you have not yet fully grieved?',                                                                                                                type: 'textarea', required: true },
    ],
  },
  {
    title: 'WHAT YOU ARE REACHING TOWARD',
    questions: [
      { id: 's33', text: 'What does a life that feels genuinely yours look like? Describe it concretely.',                                                                                         type: 'textarea', required: true },
      { id: 's34', text: 'What would have to change internally for that life to become possible?',                                                                                                 type: 'textarea', required: true },
    ],
  },
  {
    title: 'OPEN FIELD',
    questions: [
      { id: 's35', text: 'What do you hope to receive or experience from this reading? Is there anything important you feel has not been asked?',                                                   type: 'textarea', required: true },
      { id: 's36', text: 'What is your attachment style and how aware are you of it, how does this repeat in your relationships?',                                                                  type: 'textarea', required: true },
      { id: 's37', text: 'What is your Myers-Briggs type?',                                                                                                                                        type: 'textarea', required: true },
      { id: 's38', text: 'What is your Enneagram type?',                                                                                                                                           type: 'textarea', required: true },
    ],
  },
]

// ─── RELATIONAL FORM (Loving By Design) — 40 questions (v2) + Person B birth data
// Products 5 (Synastry) and 6 (HD Composite). Each partner answers the same
// questions on their own chart row. v2 is the active form. v1 (42 questions,
// r1–r42) is kept below, inactive, so submissions made under it stay readable
// with their original wording.

export const RELATIONAL_QUESTIONNAIRE_VERSION = 'lbd-v2'
export const RELATIONAL_V1_VERSION            = 'lbd-v1'
// Reserved key inside charts.intake_relational; set by the server on every save.
export const RELATIONAL_VERSION_KEY           = '_questionnaire_version'

export const RELATIONAL_PERSON_B_SECTION: IntakeSection = {
  title: "Your Partner's Birth Data",
  description: 'This is used to calculate their chart. Please be as precise as possible.',
  questions: [
    { id: 'r_name',    text: 'Full name (or first name)',                  type: 'text', required: true },
    { id: 'r_date',    text: 'Date of birth',                              type: 'date', required: true },
    { id: 'r_time',    text: 'Time of birth',                              type: 'time', required: true, placeholder: 'Approximate is fine — note if uncertain' },
    { id: 'r_city',    text: 'City of birth',                              type: 'text', required: true },
    { id: 'r_state',   text: 'State / Province of birth',                  type: 'text' },
    { id: 'r_country', text: 'Country of birth',                           type: 'text', required: true },
    { id: 'r_time_known', text: 'How certain are you of their birth time?', type: 'select',
      options: ['Exact from birth certificate', 'From memory', 'Approximate', 'Unknown — used noon'] },
  ],
}

// IDs are new (lbd2_NN) so no v1 answer is ever read against v2 wording.
// `source` is the v1 question(s) each v2 question corresponds to by content
// ('direct': same question reworded; 'partial': overlapping theme). `draftTag`
// keeps the tag supplied with the v2 draft, whose numbers did not match the v1
// wording. No `source` means the question has no v1 counterpart. Every question
// is required.
export const RELATIONAL_SECTIONS: IntakeSection[] = [
  {
    title: 'SECTION 1 — RELATIONAL ORIGINS AND CONDITIONING',
    questions: [
      { id: 'lbd2_01', text: 'What did love, affection, and emotional connection look like in your childhood home? How have those early experiences influenced what you expect from intimate relationships today?', type: 'textarea', required: true, source: ['r29'], match: 'direct', draftTag: 'r1' },
      { id: 'lbd2_02', text: 'How would you describe your relationship with your mother or primary maternal caregiver? What patterns from that relationship do you recognize in your romantic partnerships?', type: 'textarea', required: true, source: ['r27'], match: 'partial', draftTag: 'r2' },
      { id: 'lbd2_03', text: 'How would you describe your relationship with your father or primary paternal caregiver? What patterns from that relationship do you recognize in your romantic partnerships?', type: 'textarea', required: true, source: ['r27'], match: 'partial', draftTag: 'r3' },
      { id: 'lbd2_04', text: 'What did you learn growing up about expressing emotions, communicating needs, receiving affection, and navigating conflict?', type: 'textarea', required: true, source: ['r28'], match: 'partial', draftTag: 'r4' },
      { id: 'lbd2_05', text: 'What relationship patterns have repeated across your romantic history, regardless of who your partner was?', type: 'textarea', required: true, draftTag: 'r5' },
      { id: 'lbd2_06', text: 'What significant experiences from previous relationships continue to influence how you approach trust, vulnerability, intimacy, or commitment?', type: 'textarea', required: true, draftTag: 'r6' },
    ],
  },
  {
    title: 'SECTION 2 — YOUR CURRENT RELATIONSHIP',
    questions: [
      { id: 'lbd2_07', text: 'How did you and your partner meet, and what initially attracted you to this person? What qualities or experiences made you want to pursue the relationship?', type: 'textarea', required: true, source: ['r1', 'r2'], revision: 'merged', match: 'direct', draftTag: 'r7' },
      { id: 'lbd2_08', text: 'How would you describe the current state of your relationship, emotionally, psychologically, physically, and practically?', type: 'textarea', required: true, source: ['r6'], match: 'direct', draftTag: 'r8' },
      { id: 'lbd2_09', text: 'What aspects of your relationship feel most fulfilling, nourishing, or supportive? What do you appreciate most about your partner?', type: 'textarea', required: true, source: ['r7', 'r26'], revision: 'merged', match: 'direct', draftTag: 'r9' },
      { id: 'lbd2_10', text: 'What recurring challenges, tensions, or patterns are present in your relationship? How do these dynamics affect your sense of connection, emotional safety, and ability to understand one another?', type: 'textarea', required: true, source: ['r8', 'r9'], revision: 'merged', match: 'direct', draftTag: 'r10 + r13 MERGED' },
      { id: 'lbd2_11', text: 'What needs, desires, or expectations do you have within this relationship that you feel are consistently met, partially met, or unmet?', type: 'textarea', required: true, source: ['r21'], match: 'partial', draftTag: 'r11' },
      { id: 'lbd2_12', text: 'In what ways has this relationship supported your personal growth, self-awareness, or understanding of yourself? Where has it challenged you most?', type: 'textarea', required: true, source: ['r18'], match: 'direct', draftTag: 'r12' },
    ],
  },
  {
    title: 'SECTION 3 — COMMUNICATION, CONFLICT, AND REPAIR',
    questions: [
      { id: 'lbd2_13', text: 'How do you typically communicate your thoughts, feelings, desires, and needs to your partner? What becomes difficult to express?', type: 'textarea', required: true, source: ['r37'], match: 'partial', draftTag: 'r14' },
      { id: 'lbd2_14', text: 'When disagreement or conflict arises, what is your immediate response? Do you confront, withdraw, defend, accommodate, shut down, or respond in another way?', type: 'textarea', required: true, source: ['r10', 'r13'], revision: 'merged', match: 'direct', draftTag: 'r15' },
      { id: 'lbd2_15', text: 'What behaviors or responses from your partner tend to activate you emotionally? What do you believe those reactions reveal about your own experiences, expectations, or unresolved patterns?', type: 'textarea', required: true, source: ['r17'], match: 'partial', draftTag: 'r16' },
      { id: 'lbd2_16', text: 'How do you experience your partner’s responses during conflict? What do you believe they struggle to understand about your perspective?', type: 'textarea', required: true, source: ['r11'], match: 'direct', draftTag: 'r17' },
      { id: 'lbd2_17', text: 'After conflict, disconnection, or emotional rupture, how do you typically attempt repair? What helps you restore trust and connection, and what makes repair difficult?', type: 'textarea', required: true, draftTag: 'r18' },
    ],
  },
  {
    title: 'SECTION 4 — INTIMACY, ATTACHMENT, AND THE BODY',
    questions: [
      { id: 'lbd2_18', text: 'How do you experience emotional and physical intimacy within your relationship? What helps you feel safe, connected, desired, and genuinely known by your partner, and what circumstances cause you to withdraw, protect yourself, or disconnect?', type: 'textarea', required: true, source: ['r16', 'r17'], revision: 'merged', match: 'direct', draftTag: 'r19 + r23 MERGED' },
      { id: 'lbd2_19', text: 'How comfortable are you with allowing your partner to see your vulnerabilities, insecurities, fears, and unmet needs? What happens within you when you feel deeply seen?', type: 'textarea', required: true, source: ['r20'], match: 'partial', draftTag: 'r20' },
      { id: 'lbd2_20', text: 'How do you typically respond when your partner seeks closeness, reassurance, independence, or space? What patterns do you recognize in your attachment responses?', type: 'textarea', required: true, draftTag: 'r21' },
      { id: 'lbd2_21', text: 'When you experience emotional closeness, attraction, conflict, rejection, or disconnection with your partner, what do you notice happening in your physical body? Describe any changes in breathing, muscular tension, posture, movement, sensation, energy, or desire for contact. How do these bodily responses influence the way you relate to your partner?', type: 'textarea', required: true, draftTag: 'NEW — SOMATIC' },
      { id: 'lbd2_22', text: 'What role does physical affection, sexual expression, or erotic connection play in your relationship? How do you experience the balance between your desires, your partner’s desires, and your shared capacity for intimacy?', type: 'textarea', required: true, source: ['r15'], match: 'partial', draftTag: 'r24 — PRESERVED' },
      { id: 'lbd2_23', text: 'How do you communicate your boundaries, preferences, and desires around physical intimacy? How comfortable are you receiving your partner’s boundaries or hearing desires that differ from your own?', type: 'textarea', required: true, draftTag: 'r25' },
    ],
  },
  {
    title: 'SECTION 5 — INDIVIDUAL IDENTITY WITHIN PARTNERSHIP',
    questions: [
      { id: 'lbd2_24', text: 'Who do you understand yourself to be within this relationship? How does that compare with who you are when you are alone or outside the partnership?', type: 'textarea', required: true, draftTag: 'r26' },
      { id: 'lbd2_25', text: 'What aspects of yourself do you feel free to express within your relationship, and what aspects do you suppress, minimize, or conceal?', type: 'textarea', required: true, source: ['r19', 'r24'], revision: 'merged', match: 'direct', draftTag: 'r27' },
      { id: 'lbd2_26', text: 'Where do you tend to compromise your needs, values, boundaries, or authenticity to maintain connection, avoid conflict, or preserve the relationship?', type: 'textarea', required: true, source: ['r22', 'r23'], revision: 'merged', match: 'direct', draftTag: 'r28' },
      { id: 'lbd2_27', text: 'How do you make significant personal or shared decisions? What happens when your preferences, priorities, or sense of direction differ from your partner’s?', type: 'textarea', required: true, draftTag: 'r29' },
      { id: 'lbd2_28', text: 'What personal strengths do you bring into this relationship? What behaviors or tendencies of your own do you recognize as contributing to its challenges?', type: 'textarea', required: true, source: ['r12'], match: 'partial', draftTag: 'r30' },
    ],
  },
  {
    title: 'SECTION 6 — FAMILY PATTERNS AND SHARED RESPONSIBILITIES',
    questions: [
      { id: 'lbd2_29', text: 'What beliefs or expectations about partnership, marriage, commitment, or family have you inherited from your upbringing? Which have you consciously chosen to retain or change?', type: 'textarea', required: true, source: ['r28'], match: 'partial', draftTag: 'r31' },
      { id: 'lbd2_30', text: 'How do you and your partner navigate money, financial security, spending, saving, and material responsibilities? Where do you experience alignment or tension?', type: 'textarea', required: true, source: ['r32'], match: 'direct', draftTag: 'r32' },
      { id: 'lbd2_31', text: 'How do you and your partner approach household responsibilities, daily routines, work obligations, and the practical demands of sharing a life?', type: 'textarea', required: true, draftTag: 'r33' },
      { id: 'lbd2_32', text: 'What role do children, parenting, or the possibility of having children play in your relationship? How aligned are your desires, expectations, and concerns in this area?', type: 'textarea', required: true, source: ['r33'], match: 'direct', draftTag: 'r34' },
    ],
  },
  {
    title: 'SECTION 7 — PROJECTION, SHADOW, AND HIDDEN DYNAMICS',
    questions: [
      { id: 'lbd2_33', text: 'What qualities or behaviors in your partner provoke your strongest admiration, frustration, jealousy, or judgment? What might those responses reveal about parts of yourself you embrace, reject, or struggle to acknowledge?', type: 'textarea', required: true, draftTag: 'r35' },
      { id: 'lbd2_34', text: 'What fears arise when you imagine losing this relationship, being rejected, being abandoned, or losing your independence within it?', type: 'textarea', required: true, source: ['r31'], match: 'partial', draftTag: 'r36' },
      { id: 'lbd2_35', text: 'What do you believe your partner sees or experiences in you that you have difficulty recognizing or accepting about yourself?', type: 'textarea', required: true, draftTag: 'r37' },
      { id: 'lbd2_36', text: 'What truth about yourself, your partner, or your relationship have you been reluctant to acknowledge or communicate openly?', type: 'textarea', required: true, draftTag: 'r38 — PRESERVED' },
    ],
  },
  {
    title: 'SECTION 8 — SHARED FUTURE AND ASPIRATIONS',
    questions: [
      { id: 'lbd2_37', text: 'What does a deeply fulfilling and sustainable relationship look like to you? Describe the emotional, physical, practical, and personal qualities you would want to experience together.', type: 'textarea', required: true, source: ['r36'], match: 'direct', draftTag: 'r39' },
      { id: 'lbd2_38', text: 'How aligned do you and your partner feel regarding your future direction, individual aspirations, shared priorities, and the life you are building together?', type: 'textarea', required: true, source: ['r34'], match: 'partial', draftTag: 'r40' },
      { id: 'lbd2_39', text: 'What would need to change within yourself, your partner’s participation, or the relationship dynamic for your connection to become more fulfilling and sustainable?', type: 'textarea', required: true, draftTag: 'r41' },
    ],
  },
  {
    title: 'SECTION 9 — SELF-KNOWLEDGE AND READING INTENTIONS',
    questions: [
      { id: 'lbd2_40', text: 'What do you most want this reading to help you understand about yourself, your partner, and the dynamics of your relationship? Is there anything significant you feel has not been asked?', type: 'textarea', required: true, source: ['r41', 'r42'], revision: 'merged', match: 'direct', draftTag: 'r42 — PRESERVED' },
    ],
  },

]

// v1 questions with no v2 counterpart. Their answers stay readable under v1 wording.
export const RELATIONAL_V1_RETIRED = ['r3', 'r4', 'r5', 'r14', 'r25', 'r30', 'r35', 'r38', 'r39', 'r40']

// Inactive. Historical record of the v1 form for submissions made under it.
export const RELATIONAL_SECTIONS_V1: IntakeSection[] = [
  {
    title: 'HOW YOU CAME TOGETHER',
    questions: [
      { id: 'r1', text: 'How did you and your partner meet and what was your first impression of them?', type: 'textarea', required: true },
      { id: 'r2', text: 'What drew you toward this specific person and what quality in them pulled you in most strongly?', type: 'textarea', required: true },
      { id: 'r3', text: 'What did you sense about this relationship early on that you could not yet name?', type: 'textarea', required: true },
      { id: 'r4', text: 'Why do you believe you and your partner found each other? Go beneath the surface answer. Consider what you were each carrying when you met, what you recognized in each other, and what that recognition may have been asking of you.', type: 'textarea', required: true },
    ],
  },
  {
    title: 'CURRENT RELATIONSHIP QUALITY',
    questions: [
      { id: 'r5', text: 'What brings you to this relationship reading at this point in time? Answer from your own perspective and lived experience.', type: 'textarea', required: true },
      { id: 'r6', text: 'How would you describe the overall quality of the relationship right now, not the events, but the felt sense of it inside of you, whether objectively true or not, it matters?', type: 'textarea', required: true },
      { id: 'r7', text: 'What is working well between you that you want to protect within this relationship?', type: 'textarea', required: true },
      { id: 'r8', text: 'What is the central tension or recurring friction in the relationship?', type: 'textarea', required: true },
      { id: 'r9', text: 'What patterns tend to repeat between you and your partner, even when your intentions are good?', type: 'textarea', required: true },
    ],
  },
  {
    title: 'COMMUNICATION AND CONFLICT',
    questions: [
      { id: 'r10', text: 'How do you typically handle disagreement and do you tend to pursue, withdraw, shut down, or escalate?', type: 'textarea', required: true },
      { id: 'r11', text: 'What does your partner do in conflict that is most difficult for you to receive?', type: 'textarea', required: true },
      { id: 'r12', text: 'What do you do in conflict that you suspect is most difficult for your partner?', type: 'textarea', required: true },
      { id: 'r13', text: 'When conflict, tension, or emotional distance arises, describe your default way of coping or responding and what that pattern has cost you.', type: 'textarea', required: true },
    ],
  },
  {
    title: 'INTIMACY AND CONNECTION',
    questions: [
      { id: 'r14', text: 'How connected do you feel to your partner emotionally right now on a scale of 1 to 10, and what is driving that number?', type: 'number', required: true },
      { id: 'r15', text: 'Where has intimacy, emotional, physical, or both, become strained or routine, and what do you think is underneath that?', type: 'textarea', required: true },
      { id: 'r16', text: 'What does genuine closeness feel like for you and how often do you experience it in this relationship?', type: 'textarea', required: true },
      { id: 'r17', text: 'When you feel most loved and secure in a relationship, what specifically is happening? And when you feel most unsafe or unseen, what tends to trigger that and how do you typically respond?', type: 'textarea', required: true },
    ],
  },
  {
    title: 'INDIVIDUAL WITHIN THE RELATIONSHIP',
    questions: [
      { id: 'r18', text: 'In what ways have you changed since being with this person, for better and for worse?', type: 'textarea', required: true },
      { id: 'r19', text: 'What parts of yourself do you suppress, minimize, or hide in this relationship and what do you believe would happen if you stopped?', type: 'textarea', required: true },
      { id: 'r20', text: 'What part of yourself feels most unseen, misunderstood, or difficult to express in this relationship and how long has that been true?', type: 'textarea', required: true },
      { id: 'r21', text: 'What do you need from a relationship that you have not been able to ask for directly, and what has stopped you from asking?', type: 'textarea', required: true },
      { id: 'r22', text: 'What do you tend to override in yourself to keep the relationship functioning or to keep the peace, and what does that cost you over time?', type: 'textarea', required: true },
      { id: 'r23', text: 'What do you believe, at your core, will happen if you stop performing, accommodating, or managing in this relationship?', type: 'textarea', required: true },
      { id: 'r24', text: 'Describe a version of yourself you have never fully shown a partner and what has kept that part hidden.', type: 'textarea', required: true },
      { id: 'r25', text: 'What part of your own design, nature, or needs do you understand intellectually but struggle to trust or live by consistently in relationship?', type: 'textarea', required: true },
      { id: 'r26', text: 'What do you genuinely appreciate or respect about your partner that may not be spoken often enough?', type: 'textarea', required: true },
    ],
  },
  {
    title: 'FAMILY PATTERNS IN THE RELATIONSHIP',
    questions: [
      { id: 'r27', text: 'In what ways does your partner remind you of one of your parents, positively or negatively, and how aware of that dynamic are you in real time?', type: 'textarea', required: true },
      { id: 'r28', text: 'What relational pattern from your family of origin are you most aware of repeating in this relationship?', type: 'textarea', required: true },
      { id: 'r29', text: 'What did love look like in your childhood home and how has that blueprint shown up in your adult relationships, wanted or not?', type: 'textarea', required: true },
    ],
  },
  {
    title: 'THE HIDDEN SELF AND WHAT YOU CARRY',
    questions: [
      { id: 'r30', text: 'What is the story you tell yourself about why this relationship is hard, and how much of that story do you actually believe?', type: 'textarea', required: true },
      { id: 'r31', text: 'What do you fear at your core will happen if this relationship cannot become what you need it to be?', type: 'textarea', required: true },
    ],
  },
  {
    title: 'SHARED LIFE AND FUTURE',
    questions: [
      { id: 'r32', text: 'How do you and your partner manage money together and is there alignment, tension, or avoidance around financial decisions and material security?', type: 'textarea', required: true },
      { id: 'r33', text: 'Describe where children fit into your shared vision and whether that question carries weight, conflict, or grief between you.', type: 'textarea', required: true },
      { id: 'r34', text: 'How aligned are you in your professional ambitions and do your careers support each other or create friction in the relationship?', type: 'textarea', required: true },
      { id: 'r35', text: 'Describe where you and your partner share or differ in spiritual framework, practice, or philosophical orientation and how that affects the relationship.', type: 'textarea', required: true },
    ],
  },
  {
    title: 'WHAT YOU WANT FOR THE RELATIONSHIP',
    questions: [
      { id: 'r36', text: 'What would this relationship need to look like for you to feel it is genuinely thriving?', type: 'textarea', required: true },
      { id: 'r37', text: 'What is the one thing you most want your partner to understand about you that you have not been able to communicate effectively?', type: 'textarea', required: true },
      { id: 'r38', text: 'What do you hope becomes clearer, more stable, or more honest for you through this process?', type: 'textarea', required: true },
    ],
  },
  {
    title: 'SELF-KNOWLEDGE',
    questions: [
      { id: 'r39', text: 'What is your Myers-Briggs type and how accurately do you feel it describes you?', type: 'textarea', required: true },
      { id: 'r40', text: 'What is your Enneagram type and what does understanding it have changed about how you see yourself in relationship?', type: 'textarea', required: true },
    ],
  },
  {
    title: 'OPEN FIELD',
    questions: [
      { id: 'r41', text: 'Is there anything significant about your history, your body, your patterns, or your current circumstances that you want this reading to hold?', type: 'textarea' },
      { id: 'r42', text: 'What do you most want this reading to clarify, confirm, or challenge about this relationship?', type: 'textarea', required: true },
    ],
  },
]

// ─── PARENTING FORM — 50 questions (v2) + Child birth data ───────────────────
// Products 7 (Parenting Astro) and 8 (Parenting HD)
// v2 is the active form. v1 (67 questions, p1–p68) is kept below, inactive, so
// submissions made under it stay readable with their original wording.

export const PARENTING_CHILD_SECTION: IntakeSection = {
  title: "Your Child's Birth Data",
  description: 'This is used to calculate their chart. Birth time precision matters significantly for their chart.',
  questions: [
    { id: 'c_name',    text: 'Child\'s first name',                          type: 'text', required: true },
    { id: 'c_date',    text: 'Date of birth',                                type: 'date', required: true },
    { id: 'c_time',    text: 'Time of birth',                                type: 'time', required: true },
    { id: 'c_city',    text: 'City of birth',                                type: 'text', required: true },
    { id: 'c_state',   text: 'State / Province of birth',                    type: 'text' },
    { id: 'c_country', text: 'Country of birth',                             type: 'text', required: true },
    { id: 'c_time_known', text: 'How certain are you of their birth time?',  type: 'select',
      options: ['Exact from birth certificate', 'From memory', 'Approximate', 'Unknown — used noon'] },
  ],
}

export const PARENTING_INTRO = "The accuracy and depth of your child's report depends on the honesty and specificity of what you share here. Your child arrived with their own chart, their own timing, their own design. What the chart cannot show is how those conditions have actually landed in their lived experience, in your relationship with them, and in the daily reality of your family. The more precisely you describe your child as they actually are, not who you hope they will become, not the most composed version of the family, but the real child in front of you, the more this reading can identify where their design is expressing cleanly, where it is being blocked, where their potential has not yet met the right conditions, and where genuine tension exists between who they are built to be and how they are currently being met. This form is completed by the parent. Answer about your child, not yourself, except where the question directly asks about you. Honest, specific answers produce interpretations that can actually serve this child."

export const PARENTING_PRODUCT_LINE = "Parenting Astrology · Parenting HD"

export const PARENTING_QUESTIONNAIRE_VERSION = 'parenting-v2'
export const PARENTING_V1_VERSION          = 'parenting-v1'
// Reserved key inside charts.intake_parenting; set by the server on every save.
export const PARENTING_VERSION_KEY         = '_questionnaire_version'

// IDs are new (pv2_NN) so no v1 answer is ever read against v2 wording.
// `source` gives the v1 IDs each question replaces.
// Every v2 question is required (owner decision, 2026-11-04), including 15, 21,
// 28 and 36, which the source document marks Optional.
export const PARENTING_SECTIONS: IntakeSection[] = [
  {
    title: 'SECTION 1 — FAMILY AND CHILD CONTEXT',
    questions: [
      { id: 'pv2_01', text: 'Describe your child, not who you want them to be, but who they actually are right now.', type: 'textarea', required: true, source: ['p1'] },
      { id: 'pv2_02', text: 'What do you understand about your child that you feel most people miss or misread?', type: 'textarea', required: true, source: ['p3'] },
      { id: 'pv2_03', text: 'What is your relationship to this child?', type: 'select', options: ['Biological Parent', 'Adoptive Parent', 'Step-Parent', 'Guardian', 'Foster Parent', 'Mentor/Coach'], required: true, source: ['p4'] },
      { id: 'pv2_04', text: 'What is your current living arrangement as it relates to this child, and who predominantly lives in the child’s household?', type: 'select', options: ['Full Time in Two Parent Household', 'Full Time in One Parent Household', 'Primary Split', 'Non-Primary Split', 'No Custody', 'Other'], required: true, source: ['p5', 'p6'], revision: 'merged', detail: { id: 'pv2_04_household', text: 'Identify the people who predominantly live with or care for the child.', type: 'textarea', required: true } },
      { id: 'pv2_05', text: 'Does your child have siblings? If yes, describe their position in the sibling order and the quality of those relationships. If no, describe what that absence has been like for them.', type: 'textarea', required: true, source: ['p14'] },
    ],
  },
  {
    title: 'SECTION 2 — IDENTITY AND TEMPERAMENT',
    questions: [
      { id: 'pv2_06', text: 'How would you describe your child’s baseline temperament, their default way of moving through the world when nothing is activating them?', type: 'textarea', required: true, source: ['p7'] },
      { id: 'pv2_07', text: 'Is your child more introverted or extroverted, do they refuel through solitude or through connection?', type: 'textarea', required: true, source: ['p8'] },
      { id: 'pv2_08', text: 'How does your child handle change, transition, or the unexpected?', type: 'textarea', required: true, source: ['p10'] },
      { id: 'pv2_09', text: 'What does your child do when they are overwhelmed, do they shut down, escalate, withdraw, or seek contact?', type: 'textarea', required: true, source: ['p11'] },
    ],
  },
  {
    title: 'SECTION 3 — INTERESTS, JOY, AND NATURAL INTELLIGENCE',
    questions: [
      { id: 'pv2_10', text: 'What brings your child genuine joy, curiosity, or excitement? What activities, subjects, or experiences are they naturally drawn toward, and what do you notice about their behavior when they are fully engaged?', type: 'textarea', required: true, source: ['p12', 'p13'], revision: 'merged' },
      { id: 'pv2_11', text: 'How does your child learn best, through doing, through reading, through conversation, through observation, or through movement?', type: 'textarea', required: true, source: ['p15'] },
      { id: 'pv2_12', text: 'Where does your child show natural intelligence or insight that surprises you?', type: 'textarea', required: true, source: ['p16'] },
      { id: 'pv2_13', text: 'Where does your child struggle in learning environments and what do you think is underneath that struggle?', type: 'textarea', required: true, source: ['p17'] },
      { id: 'pv2_14', text: 'How does your child respond to instruction, correction, or being told they are wrong?', type: 'textarea', required: true, source: ['p18'] },
      { id: 'pv2_15', text: 'Does your child have a diagnosed learning difference, sensory sensitivity, or developmental pattern you want the reading to hold?', type: 'textarea', required: true, source: ['p20'] },
    ],
  },
  {
    title: 'SECTION 4 — EMOTIONAL EXPRESSION AND REGULATION',
    questions: [
      { id: 'pv2_16', text: 'When your child becomes emotionally overwhelmed or distressed, what helps them return to balance most reliably? Do they need physical closeness, reassurance, words, space, movement, distraction, or something else? How do they communicate that need to you?', type: 'textarea', required: true, source: ['p19', 'p24'], revision: 'merged' },
      { id: 'pv2_17', text: 'How does your child typically express their emotions through their behavior, communication, and physical responses? Describe the emotional or behavioral patterns you observe most frequently, particularly when they are excited, frustrated, disappointed, or overwhelmed.', type: 'textarea', required: true, source: ['p21', 'p39'], revision: 'merged' },
      { id: 'pv2_18', text: 'What emotions are easiest for your child to express and what emotions do they seem to hold back or suppress?', type: 'textarea', required: true, source: ['p22'] },
      { id: 'pv2_19', text: 'How long does it typically take your child to recover after emotional activation, minutes, hours, or longer?', type: 'textarea', required: true, source: ['p23'] },
      { id: 'pv2_20', text: 'What has been your relationship to managing or holding their emotional behaviors?', type: 'textarea', required: true, source: ['p25'] },
      { id: 'pv2_21', text: 'Does your child carry anxiety, sadness, anger, or fear in a way that concerns you? Describe what that looks like in their body and behavior.', type: 'textarea', required: true, source: ['p26'] },
      { id: 'pv2_22', text: 'Does your child show any orientation toward mystery, meaning, or something larger than everyday life, a spiritual sensitivity, philosophical curiosity, or unusual depth for their age?', type: 'textarea', required: true, source: ['p27'] },
    ],
  },
  {
    title: 'SECTION 5 — SOCIAL AND ATTACHMENT PATTERNS',
    questions: [
      { id: 'pv2_23', text: 'How does your child move in social environments, do they lead, observe, attach to one person, or float between groups?', type: 'textarea', required: true, source: ['p31'] },
      { id: 'pv2_24', text: 'What is the quality of your child’s closest friendships, deep and few, wide and surface, or somewhere between?', type: 'textarea', required: true, source: ['p32'] },
      { id: 'pv2_25', text: 'How does your child handle conflict with peers, do they confront, avoid, appease, or withdraw?', type: 'textarea', required: true, source: ['p33'] },
      { id: 'pv2_26', text: 'Does your child generally seek you for comfort? Describe why or why not from your perspective.', type: 'textarea', required: true, source: ['p35'] },
    ],
  },
  {
    title: 'SECTION 6 — SOMATIC AND PHYSICAL EXPRESSION',
    questions: [
      { id: 'pv2_27', text: 'How does your child inhabit their body, are they physically confident, physically cautious, sensory-seeking, or sensory-avoidant?', type: 'textarea', required: true, source: ['p36'] },
      { id: 'pv2_28', text: 'Does your child have any chronic physical patterns, sleep disruption, digestive sensitivity, hyperactivity, fatigue, or pain, that feel connected to how they are living emotionally?', type: 'textarea', required: true, source: ['p37'] },
      { id: 'pv2_29', text: 'How does your child use physical movement, is it regulatory, expressive, compulsive, or avoided?', type: 'textarea', required: true, source: ['p38'] },
    ],
  },
  {
    title: 'SECTION 7 — THE PARENT-CHILD RELATIONSHIP',
    questions: [
      { id: 'pv2_30', text: 'What behaviors demonstrated by your child trigger you most strongly? When those behaviors arise, what happens emotionally, psychologically, or physically within you? Do you recognize any connection to unresolved experiences, familiar patterns, wounds, or younger versions of yourself?', type: 'textarea', required: true, source: ['p28', 'p44'], revision: 'merged' },
      { id: 'pv2_31', text: 'When your child resists you, what is your first reaction and your second reaction? Explain your psychological interpretation of each.', type: 'textarea', required: true, source: ['p29'] },
      { id: 'pv2_32', text: 'How do you typically repair after conflict or rupture with your child, and how does your child usually respond?', type: 'textarea', required: true, source: ['p30'] },
      { id: 'pv2_33', text: 'What situations or experiences seem most nourishing to your child when they are with you? When do you personally feel closest to your child, and what do you notice about the quality of your connection during those moments?', type: 'textarea', required: true, source: ['p40', 'p48'], revision: 'merged' },
      { id: 'pv2_34', text: 'What is the most challenging aspect of parenting this specific child? Describe the situations in which you feel most unsure, overwhelmed, emotionally activated, or unable to maintain your footing. What happens within you during those moments?', type: 'textarea', required: true, source: ['p42', 'p55'], revision: 'merged' },
      { id: 'pv2_35', text: 'When do you feel most distant from your child?', type: 'textarea', required: true, source: ['p49'] },
      { id: 'pv2_36', text: 'If there is any behavioral conflict with the other parent, describe it.', type: 'textarea', required: true, source: ['p50'] },
      { id: 'pv2_37', text: 'Are you noticing repeated themes or cycles with your child, bigger than behavior?', type: 'textarea', required: true, source: ['p51'] },
    ],
  },
  {
    title: 'SECTION 8 — PARENTAL CONDITIONING AND PROJECTION',
    questions: [
      { id: 'pv2_38', text: 'What worries you most about your child’s future?', type: 'textarea', required: true, source: ['p43'] },
      { id: 'pv2_39', text: 'Is there anything you secretly hope your child becomes, achieves, or avoids because of your own life experience?', type: 'textarea', required: true, source: ['p45'] },
      { id: 'pv2_40', text: 'What do you most want to give this child that you did not receive?', type: 'textarea', required: true, source: ['p46'] },
      { id: 'pv2_41', text: 'What do you know about this child’s grandparents, one defining quality or central struggle from each line, and what from that generation do you feel living in this child?', type: 'textarea', required: true, source: ['p47'] },
    ],
  },
  {
    title: 'SECTION 9 — PARENTING AWARENESS AND ATTACHMENT',
    questions: [
      { id: 'pv2_42', text: 'How would you describe the parent you actually are in day-to-day life, particularly when you are tired, stressed, challenged, or emotionally activated? How does that compare with the kind of parent you believe yourself to be at your core?', type: 'textarea', required: true, source: ['p52', 'p53'], revision: 'merged' },
      { id: 'pv2_43', text: 'What do you feel most confident in within your parenting, and why?', type: 'textarea', required: true, source: ['p54'] },
      { id: 'pv2_44', text: 'What part of your own design, nature, or needs do you understand intellectually but struggle to trust or live by consistently as a parent?', type: 'textarea', required: true, source: ['p56'] },
      { id: 'pv2_45', text: 'When your child needs reassurance, closeness, independence, or emotional support, how do you typically respond? Describe what happens within you when your child seeks connection, resists your guidance, withdraws, or expresses difficult emotions. Are there patterns in your responses that you recognize from your own attachment experiences?', type: 'textarea', required: true, source: ['p57'], revision: 'revised' },
      { id: 'pv2_46', text: 'When your child feels distressed, uncertain, rejected, or separated from you, how do they typically respond? Do they seek closeness, become more independent, withdraw, become anxious, resist comfort, or respond in another way? How do they behave when connection is restored?', type: 'textarea', required: true, source: ['p58'], revision: 'revised' },
      { id: 'pv2_47', text: 'When decisions need to be made for your child around structure, limits, routines, or direction, what feels most challenging or unclear for you?', type: 'textarea', required: true, source: ['p59'] },
      { id: 'pv2_48', text: 'Are there ways you worry you might be over-guiding, under-guiding, or unintentionally shaping who your child should be?', type: 'textarea', required: true, source: ['p60'] },
    ],
  },
  {
    title: 'SECTION 10 — INTENTIONS AND INTEGRATION',
    questions: [
      { id: 'pv2_49', text: 'What do you most want this reading to help you understand about your child, yourself, or your relationship together? Where are you seeking greater clarity, and what would you hope to see or approach differently as a parent?', type: 'textarea', required: true, source: ['p63', 'p65'], revision: 'merged' },
      { id: 'pv2_50', text: 'What answer are you afraid this reading might give you about your child or your parenting?', type: 'textarea', required: true, source: ['p64'] },
    ],
  },
]

// Inactive. Historical record of the v1 form for submissions made under it.
export const PARENTING_SECTIONS_V1: IntakeSection[] = [
  {
    title: 'YOUR CHILD AT A GLANCE',
    questions: [
      { id: 'p1',  text: 'Describe your child, not who you want them to be, but who they actually are right now.',               type: 'textarea', required: true },
      { id: 'p2',  text: 'What is the first thing most people notice about your child when they meet them?',                      type: 'textarea', required: true },
      { id: 'p3',  text: 'What do you understand about your child that you feel most people miss or misread?',                    type: 'textarea', required: true },
      { id: 'p4',  text: 'What is your relationship to this child?',
        type: 'select', required: true,
        options: ['Biological Parent', 'Adoptive Parent', 'Step-Parent', 'Guardian', 'Foster Parent', 'Mentor/Coach'] },
      { id: 'p5',  text: 'Who predominantly lives with this child?',                                                              type: 'textarea', required: true },
      { id: 'p6',  text: 'What is your current living arrangement as it relates to this child?',
        type: 'select', required: true,
        options: ['Full Time in Two Parent Household', 'Full Time in One Parent Household', 'Primary Split', 'Non-Primary Split', 'No Custody', 'Other'] },
    ],
  },
  {
    title: 'PERSONALITY AND TEMPERAMENT',
    questions: [
      { id: 'p7',  text: 'How would you describe your child\'s baseline temperament, their default way of moving through the world when nothing is activating them?', type: 'textarea', required: true },
      { id: 'p8',  text: 'Is your child more introverted or extroverted, do they refuel through solitude or through connection?',  type: 'textarea', required: true },
      { id: 'p9',  text: 'What seems most important to your child about who they are becoming?',                                   type: 'textarea', required: true },
      { id: 'p10', text: 'How does your child handle change, transition, or the unexpected?',                                      type: 'textarea', required: true },
      { id: 'p11', text: 'What does your child do when they are overwhelmed, do they shut down, escalate, withdraw, or seek contact?', type: 'textarea', required: true },
      { id: 'p12', text: 'What brings your child the most genuine joy, not what they are good at, but what makes them come alive?', type: 'textarea', required: true },
      { id: 'p13', text: 'What is your child currently drawn to?',                                                                type: 'textarea', required: true },
      { id: 'p14', text: 'Does your child have siblings? If yes, describe their position in the sibling order and the quality of those relationships. If no, describe what that absence has been like for them.', type: 'textarea', required: true },
    ],
  },
  {
    title: 'LEARNING AND INTELLIGENCE',
    questions: [
      { id: 'p15', text: 'How does your child learn best, through doing, through reading, through conversation, through observation, or through movement?', type: 'textarea', required: true },
      { id: 'p16', text: 'Where does your child show natural intelligence or insight that surprises you?',                         type: 'textarea', required: true },
      { id: 'p17', text: 'Where does your child struggle in learning environments and what do you think is underneath that struggle?', type: 'textarea', required: true },
      { id: 'p18', text: 'How does your child respond to instruction, correction, or being told they are wrong?',                  type: 'textarea', required: true },
      { id: 'p19', text: 'What helps your child return to balance most reliably after they become emotionally activated?',         type: 'textarea', required: true },
      { id: 'p20', text: 'Does your child have a diagnosed learning difference, sensory sensitivity, or developmental pattern you want the reading to hold?', type: 'textarea' },
    ],
  },
  {
    title: 'EMOTIONAL LIFE AND REGULATION',
    questions: [
      { id: 'p21', text: 'In what predominant ways is your child emotionally expressive?',                                        type: 'textarea', required: true },
      { id: 'p22', text: 'What emotions are easiest for your child to express and what emotions do they seem to hold back or suppress?', type: 'textarea', required: true },
      { id: 'p23', text: 'How long does it typically take your child to recover after emotional activation, minutes, hours, or longer?', type: 'textarea', required: true },
      { id: 'p24', text: 'What does your child need most from you when they are in distress, physical closeness, words, space, or distraction?', type: 'textarea', required: true },
      { id: 'p25', text: 'What has been your relationship to managing or holding their emotional behaviors?',                       type: 'textarea', required: true },
      { id: 'p26', text: 'Does your child carry anxiety, sadness, anger, or fear in a way that concerns you? Describe what that looks like in their body and behavior.', type: 'textarea' },
      { id: 'p27', text: 'Does your child show any orientation toward mystery, meaning, or something larger than everyday life, a spiritual sensitivity, philosophical curiosity, or unusual depth for their age?', type: 'textarea', required: true },
      { id: 'p28', text: 'What behaviors demonstrated by your child trigger you the most?',                                        type: 'textarea', required: true },
      { id: 'p29', text: 'When your child resists you, what is your first reaction and your second reaction? Explain your psychological interpretation of each.', type: 'textarea', required: true },
      { id: 'p30', text: 'How do you typically repair after conflict or rupture with your child, and how does your child usually respond?', type: 'textarea', required: true },
    ],
  },
  {
    title: 'SOCIAL AND RELATIONAL PATTERNS',
    questions: [
      { id: 'p31', text: 'How does your child move in social environments, do they lead, observe, attach to one person, or float between groups?', type: 'textarea', required: true },
      { id: 'p32', text: 'What is the quality of your child\'s closest friendships, deep and few, wide and surface, or somewhere between?', type: 'textarea', required: true },
      { id: 'p33', text: 'How does your child handle conflict with peers, do they confront, avoid, appease, or withdraw?',         type: 'textarea', required: true },
      { id: 'p34', text: 'Is your child more oriented toward adults or toward peers for their primary sense of belonging?',        type: 'textarea', required: true },
      { id: 'p35', text: 'Does your child generally seek you for comfort? Describe why or why not from your perspective.',         type: 'textarea', required: true },
    ],
  },
  {
    title: 'BODY AND PHYSICAL EXPRESSION',
    questions: [
      { id: 'p36', text: 'How does your child inhabit their body, are they physically confident, physically cautious, sensory-seeking, or sensory-avoidant?', type: 'textarea', required: true },
      { id: 'p37', text: 'Does your child have any chronic physical patterns, sleep disruption, digestive sensitivity, hyperactivity, fatigue, or pain, that feel connected to how they are living emotionally?', type: 'textarea' },
      { id: 'p38', text: 'How does your child use physical movement, is it regulatory, expressive, compulsive, or avoided?',       type: 'textarea', required: true },
      { id: 'p39', text: 'What does your child currently demonstrate the most in terms of behavioral or emotional expression?',    type: 'textarea', required: true },
      { id: 'p40', text: 'What situations feel nourishing to your child when they are with you?',                                  type: 'textarea', required: true },
    ],
  },
  {
    title: 'THE PARENT-CHILD DYNAMIC',
    questions: [
      { id: 'p41', text: 'What is the easiest thing about parenting this specific child?',                                         type: 'textarea', required: true },
      { id: 'p42', text: 'What is the most challenging thing about parenting this specific child, the place where you most lose your footing?', type: 'textarea', required: true },
      { id: 'p43', text: 'What worries you most about your child\'s future?',                                                      type: 'textarea', required: true },
      { id: 'p44', text: 'In what ways does this child activate something unresolved in you, a pattern, a wound, or a younger version of yourself?', type: 'textarea', required: true },
      { id: 'p45', text: 'Is there anything you secretly hope your child becomes, achieves, or avoids because of your own life experience?', type: 'textarea', required: true },
      { id: 'p46', text: 'What do you most want to give this child that you did not receive?',                                     type: 'textarea', required: true },
      { id: 'p47', text: 'What do you know about this child\'s grandparents, one defining quality or central struggle from each line, and what from that generation do you feel living in this child?', type: 'textarea', required: true },
      { id: 'p48', text: 'When do you feel closest to your child?',                                                                type: 'textarea', required: true },
      { id: 'p49', text: 'When do you feel most distant from your child?',                                                        type: 'textarea', required: true },
      { id: 'p50', text: 'If there is any behavioral conflict with the other parent, describe it.',                               type: 'textarea' },
      { id: 'p51', text: 'Are you noticing repeated themes or cycles with your child, bigger than behavior?',                     type: 'textarea', required: true },
    ],
  },
  {
    title: 'YOUR PARENTING SELF-AWARENESS',
    questions: [
      { id: 'p52', text: 'How would you describe your parenting style in day-to-day moments, not the ideal version, but the real one?', type: 'textarea', required: true },
      { id: 'p53', text: 'What kind of parent do you believe you are at your core?',                                               type: 'textarea', required: true },
      { id: 'p54', text: 'What do you feel most confident in within your parenting, and why?',                                    type: 'textarea', required: true },
      { id: 'p55', text: 'What do you feel most unsure, overwhelmed, or activated by in your parenting?',                         type: 'textarea', required: true },
      { id: 'p56', text: 'What part of your own design, nature, or needs do you understand intellectually but struggle to trust or live by consistently as a parent?', type: 'textarea', required: true },
      { id: 'p57', text: 'Being fully aware that we all carry attachment patterns across different dynamics, what attachment style would you say you lean toward most in your parenting?', type: 'textarea', required: true },
      { id: 'p58', text: 'What would you assume your child\'s attachment style is around you?',                                    type: 'textarea', required: true },
      { id: 'p59', text: 'When decisions need to be made for your child around structure, limits, routines, or direction, what feels most challenging or unclear for you?', type: 'textarea', required: true },
      { id: 'p60', text: 'Are there ways you worry you might be over-guiding, under-guiding, or unintentionally shaping who your child should be?', type: 'textarea', required: true },
      { id: 'p61', text: 'When parenting feels hardest, does it feel more like an energy mismatch, a communication gap, or a values difference?', type: 'textarea', required: true },
    ],
  },
  {
    title: 'WHAT YOU ARE ASKING FOR',
    questions: [
      { id: 'p63', text: 'What do you most want this reading to help you understand, see differently, or do better as the parent of this specific child?', type: 'textarea', required: true },
      { id: 'p64', text: 'What answer are you afraid this reading might give you about your child or your parenting?',            type: 'textarea', required: true },
      { id: 'p65', text: 'What do you most want clarity on?',                                                                     type: 'textarea', required: true },
      { id: 'p66', text: 'What would make this reading feel deeply supportive and worthwhile?',                                    type: 'textarea', required: true },
    ],
  },
  {
    title: 'SELF-KNOWLEDGE',
    questions: [
      { id: 'p67', text: 'As the adult, what is your Myers-Briggs type?',  type: 'textarea', required: true },
      { id: 'p68', text: 'As the adult, what is your Enneagram type?',     type: 'textarea', required: true },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getSelfSections(): IntakeSection[] {
  return SELF_SECTIONS
}

export function getRelationalSections(): IntakeSection[] {
  return [RELATIONAL_PERSON_B_SECTION, ...RELATIONAL_SECTIONS]
}

export function getParentingSections(): IntakeSection[] {
  return [PARENTING_CHILD_SECTION, ...PARENTING_SECTIONS]
}

export type IntakeType = 'self' | 'relational' | 'parenting'

export function getSections(type: IntakeType): IntakeSection[] {
  if (type === 'self') return getSelfSections()
  if (type === 'relational') return getRelationalSections()
  return getParentingSections()
}

export function getIntakeTitle(type: IntakeType): string {
  if (type === 'self') return 'Reading Intake'
  if (type === 'relational') return 'Relationship Reading Intake'
  return 'Parenting Reading Intake'
}

export function getIntakeSubtitle(type: IntakeType): string {
  if (type === 'self')
    return 'Your answers give the reading its depth. Take your time — there are no wrong answers.'
  if (type === 'relational')
    return 'These answers weave your lived experience into the chart analysis. Take your time.'
  return 'Your answers help the reading speak directly to your child and your dynamic together.'
}

export const SELF_QUESTION_LIST: IntakeQuestion[]      = SELF_SECTIONS.flatMap(s => s.questions)
export const RELATIONAL_QUESTION_LIST: IntakeQuestion[] = RELATIONAL_SECTIONS.flatMap(s => s.questions)
export const PARENTING_QUESTION_LIST: IntakeQuestion[]  = PARENTING_SECTIONS.flatMap(s => s.questions)

// ─── Parenting versioning ────────────────────────────────────────────────────

const PARENTING_FORMS: Record<string, IntakeSection[]> = {
  [PARENTING_QUESTIONNAIRE_VERSION]: PARENTING_SECTIONS,
  [PARENTING_V1_VERSION]:            PARENTING_SECTIONS_V1,
}

const PARENTING_BIRTH_IDS = PARENTING_CHILD_SECTION.questions.map(q => q.id)

function answerFields(q: IntakeQuestion): IntakeQuestion[] {
  return q.detail ? [q, q.detail] : [q]
}

const PARENTING_ANSWER_IDS = new Set([
  ...PARENTING_BIRTH_IDS,
  ...PARENTING_QUESTION_LIST.flatMap(answerFields).map(q => q.id),
])

function answerText(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

// Version a stored parenting intake was written under. Rows saved before v2 carry
// no stamp; birth data alone belongs to no version, since those fields are unchanged.
export function parentingIntakeVersion(intake: unknown): string | null {
  if (!intake || typeof intake !== 'object') return null
  const stamped = (intake as Record<string, unknown>)[PARENTING_VERSION_KEY]
  if (typeof stamped === 'string') return stamped
  const hasAnswers = Object.keys(intake).some(k => !PARENTING_BIRTH_IDS.includes(k))
  return hasAnswers ? PARENTING_V1_VERSION : null
}

// What the server stores: birth data and current-version answers only, stamped
// with the current version. Keys from other versions are dropped, never remapped.
export function toParentingSubmission(answers: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(answers)) {
    if (PARENTING_ANSWER_IDS.has(k) && typeof v === 'string') out[k] = v
  }
  out[PARENTING_VERSION_KEY] = PARENTING_QUESTIONNAIRE_VERSION
  return out
}

export function isParentingQuestionAnswered(q: IntakeQuestion, answers: Record<string, unknown>): boolean {
  return answerFields(q).every(f => !f.required || answerText(answers[f.id]).trim() !== '')
}

// Resume point: index of the first question still needing an answer, or -1.
export function firstUnansweredParentingIndex(answers: Record<string, unknown>): number {
  return PARENTING_QUESTION_LIST.findIndex(q => !isParentingQuestionAnswered(q, answers))
}

export function missingParentingAnswers(answers: Record<string, unknown>): string[] {
  return PARENTING_QUESTION_LIST.flatMap(answerFields)
    .filter(f => f.required && answerText(answers[f.id]).trim() === '')
    .map(f => f.id)
}

// The intake as the interpretation engine receives it: every question of the
// version the parent answered, in order, with its wording and answer.
export function buildParentingIntakePayload(intake: unknown): Record<string, unknown> | null {
  if (!intake || typeof intake !== 'object') return null
  const raw = intake as Record<string, unknown>
  const version = parentingIntakeVersion(raw) ?? PARENTING_QUESTIONNAIRE_VERSION
  const sections = PARENTING_FORMS[version]
  if (!sections) return { questionnaire_version: version, answers: raw }

  const answerOf = (q: IntakeQuestion) => answerText(raw[q.id]).trim() || null
  let number = 0
  return {
    questionnaire_version: version,
    child_details: Object.fromEntries(PARENTING_BIRTH_IDS.map(id => [id, answerText(raw[id])])),
    responses: sections.flatMap(section => section.questions.map(q => ({
      number:   ++number,
      id:       q.id,
      ...(q.source ? { source_ids: q.source } : {}),
      section:  section.title,
      question: q.text,
      answer:   answerOf(q),
      ...(q.detail ? { detail: { id: q.detail.id, question: q.detail.text, answer: answerOf(q.detail) } } : {}),
    }))),
  }
}

// ─── Self (Embody My Design) versioning ──────────────────────────────────────

const SELF_FORMS: Record<string, IntakeSection[]> = {
  [SELF_QUESTIONNAIRE_VERSION]: SELF_SECTIONS,
  [SELF_V1_VERSION]:            SELF_SECTIONS_V1,
}

// Multiple selections are stored as one string, in option order.
export const MULTI_SEPARATOR = ', '

export function splitMulti(value: string): string[] {
  return value.split(MULTI_SEPARATOR).map(v => v.trim()).filter(Boolean)
}

export function joinMulti(q: IntakeQuestion, selected: string[]): string {
  return (q.options ?? []).filter(o => selected.includes(o)).join(MULTI_SEPARATOR)
}

const SELF_ANSWER_IDS = new Set(SELF_QUESTION_LIST.flatMap(answerFields).map(q => q.id))

// Version a stored self intake was written under. Rows saved before v2 carry no stamp.
export function selfIntakeVersion(intake: unknown): string | null {
  if (!intake || typeof intake !== 'object') return null
  const stamped = (intake as Record<string, unknown>)[SELF_VERSION_KEY]
  if (typeof stamped === 'string') return stamped
  return Object.keys(intake).length > 0 ? SELF_V1_VERSION : null
}

// What the server stores: current-version answers only, stamped with the
// current version. Keys from other versions are dropped, never remapped.
export function toSelfSubmission(answers: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(answers)) {
    if (SELF_ANSWER_IDS.has(k) && typeof v === 'string') out[k] = v
  }
  out[SELF_VERSION_KEY] = SELF_QUESTIONNAIRE_VERSION
  return out
}

function isValidSelfField(f: IntakeQuestion, value: string): boolean {
  if (value === '') return !f.required
  if (f.type === 'select' && f.options) return f.options.includes(value)
  if (f.type === 'multiselect' && f.options) return splitMulti(value).every(v => f.options!.includes(v))
  return true
}

function invalidSelfFields(q: IntakeQuestion, answers: Record<string, unknown>): IntakeQuestion[] {
  return answerFields(q).filter(f => !isValidSelfField(f, answerText(answers[f.id]).trim()))
}

export function isSelfQuestionAnswered(q: IntakeQuestion, answers: Record<string, unknown>): boolean {
  return invalidSelfFields(q, answers).length === 0
}

// Resume point: index of the first question still needing an answer, or -1.
export function firstUnansweredSelfIndex(answers: Record<string, unknown>): number {
  return SELF_QUESTION_LIST.findIndex(q => !isSelfQuestionAnswered(q, answers))
}

export function missingSelfAnswers(answers: Record<string, unknown>): string[] {
  return SELF_QUESTION_LIST.flatMap(q => invalidSelfFields(q, answers)).map(f => f.id)
}

// The intake as the interpretation engine receives it: every question of the
// version the customer answered, in order, with its wording and answer.
export function buildSelfIntakePayload(intake: unknown): Record<string, unknown> | null {
  if (!intake || typeof intake !== 'object') return null
  const raw = intake as Record<string, unknown>
  const version = selfIntakeVersion(raw) ?? SELF_QUESTIONNAIRE_VERSION
  const sections = SELF_FORMS[version]
  if (!sections) return { questionnaire_version: version, answers: raw }

  const answerOf = (q: IntakeQuestion) => answerText(raw[q.id]).trim() || null
  let number = 0
  return {
    questionnaire_version: version,
    responses: sections.flatMap(section => section.questions.map(q => ({
      number:   ++number,
      id:       q.id,
      ...(q.source ? { source_ids: q.source } : {}),
      section:  section.title,
      ...(section.association ? { section_association: section.association } : {}),
      question: q.text,
      ...(q.note ? { note: q.note } : {}),
      answer:   answerOf(q),
      ...(q.detail ? { detail: { id: q.detail.id, question: q.detail.text, answer: answerOf(q.detail) } } : {}),
    }))),
  }
}

// ─── Relational (Loving By Design) versioning ────────────────────────────────

const RELATIONAL_FORMS: Record<string, IntakeSection[]> = {
  [RELATIONAL_QUESTIONNAIRE_VERSION]: RELATIONAL_SECTIONS,
  [RELATIONAL_V1_VERSION]:            RELATIONAL_SECTIONS_V1,
}

// Partner A enters Partner B's birth data; Partner B's own submission has none.
const RELATIONAL_BIRTH_IDS = RELATIONAL_PERSON_B_SECTION.questions.map(q => q.id)

const RELATIONAL_ANSWER_IDS = new Set(RELATIONAL_QUESTION_LIST.flatMap(answerFields).map(q => q.id))

// Version a stored relational intake was written under. Rows saved before v2
// carry no stamp; birth data alone belongs to no version, since those fields are unchanged.
export function relationalIntakeVersion(intake: unknown): string | null {
  if (!intake || typeof intake !== 'object') return null
  const stamped = (intake as Record<string, unknown>)[RELATIONAL_VERSION_KEY]
  if (typeof stamped === 'string') return stamped
  const hasAnswers = Object.keys(intake).some(k => !RELATIONAL_BIRTH_IDS.includes(k))
  return hasAnswers ? RELATIONAL_V1_VERSION : null
}

// What the server stores: current-version answers only (plus Partner B's birth
// data on Partner A's row), stamped with the current version. Keys from other
// versions are dropped, never remapped.
export function toRelationalSubmission(answers: Record<string, unknown>, withBirthData: boolean): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(answers)) {
    if (typeof v !== 'string') continue
    if (RELATIONAL_ANSWER_IDS.has(k) || (withBirthData && RELATIONAL_BIRTH_IDS.includes(k))) out[k] = v
  }
  out[RELATIONAL_VERSION_KEY] = RELATIONAL_QUESTIONNAIRE_VERSION
  return out
}

export function isRelationalQuestionAnswered(q: IntakeQuestion, answers: Record<string, unknown>): boolean {
  return answerFields(q).every(f => !f.required || answerText(answers[f.id]).trim() !== '')
}

// Resume point: index of the first question still needing an answer, or -1.
export function firstUnansweredRelationalIndex(answers: Record<string, unknown>): number {
  return RELATIONAL_QUESTION_LIST.findIndex(q => !isRelationalQuestionAnswered(q, answers))
}

export function missingRelationalAnswers(answers: Record<string, unknown>): string[] {
  return RELATIONAL_QUESTION_LIST.flatMap(answerFields)
    .filter(f => f.required && answerText(answers[f.id]).trim() === '')
    .map(f => f.id)
}

// One partner's intake as the interpretation engine receives it: every question
// of the version that partner answered, in order, with its wording and answer.
// Partner A's row also carries the partner birth details Partner A entered.
export function buildRelationalIntakePayload(intake: unknown, withBirthData: boolean): Record<string, unknown> | null {
  if (!intake || typeof intake !== 'object') return null
  const raw = intake as Record<string, unknown>
  const version = relationalIntakeVersion(raw) ?? RELATIONAL_QUESTIONNAIRE_VERSION
  const sections = RELATIONAL_FORMS[version]
  if (!sections) return { questionnaire_version: version, answers: raw }

  const answerOf = (q: IntakeQuestion) => answerText(raw[q.id]).trim() || null
  let number = 0
  return {
    questionnaire_version: version,
    ...(withBirthData ? { partner_birth_details: Object.fromEntries(RELATIONAL_BIRTH_IDS.map(id => [id, answerText(raw[id])])) } : {}),
    responses: sections.flatMap(section => section.questions.map(q => ({
      number:   ++number,
      id:       q.id,
      ...(q.source ? { source_ids: q.source } : {}),
      section:  section.title,
      question: q.text,
      answer:   answerOf(q),
    }))),
  }
}

// The pair's intake for Products 5-6, labelled to match the chart payload
// (person_a = the purchaser's own chart, person_b = the partner chart). Partner
// B's answers are included only once Partner B has submitted.
// Both submitted intakes, or null until both partners have submitted. Partner
// B's answers come from partner_relational_intakes (loadSubmittedPartnerAnswers),
// never from the partner chart row.
export function buildPairIntakePayload(
  self: Record<string, unknown>,
  partnerAnswers: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (self.intake_relational_complete !== true || !partnerAnswers) return null
  const personA = buildRelationalIntakePayload(self.intake_relational, true)
  const personB = buildRelationalIntakePayload(partnerAnswers, false)
  if (!personA || !personB) return null
  return { person_a: personA, person_b: personB }
}
