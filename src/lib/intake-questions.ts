export interface IntakeQuestion {
  id:          string
  text:        string
  type:        'textarea' | 'text' | 'select' | 'date' | 'time' | 'number'
  placeholder?: string
  options?:    string[]
  required?:   boolean
}

export interface IntakeSection {
  title:       string
  description?: string
  questions:   IntakeQuestion[]
}

export const RELATIONAL_INTRO = "The accuracy and depth of your relationship report depends on the honesty and specificity of what each person shares here. Your charts show the structural conditions both of you were born into and the energetic dynamics that form between your designs. What the charts cannot show is how those dynamics have actually landed in your lived experience together. The more precisely you describe your real experience of this relationship, not the ideal version, not the version you present publicly, but the one you actually live inside, the more the system can identify where your connection is functioning cleanly, where friction is structural rather than personal, where potential exists that has not yet been realized, and where genuine tension lives between what your charts carry and what your relationship currently reflects. Both partners fill this form independently. Do not consult each other before answering."

export const RELATIONAL_PRODUCT_LINE = "Astrology Synastry · HD Composite"

// ─── SELF FORM — 59 questions — Products 1, 2, 3, 4 ─────────────────────────

export const SELF_SECTIONS: IntakeSection[] = [
  {
    title: 'Core Life Context',
    questions: [
      { id: 's1',  text: 'Full name',                                                        type: 'text',     required: true  },
      { id: 's2',  text: 'Current age',                                                       type: 'text',     required: true  },
      { id: 's3',  text: 'Current city and country',                                          type: 'text',     required: true  },
      { id: 's4',  text: 'Relationship status',                                               type: 'select',   required: true,
        options: ['Single', 'In a relationship', 'Married', 'Separated', 'Divorced', 'Widowed', 'Complicated'] },
      { id: 's5',  text: 'Occupation or primary life role',                                   type: 'text'      },
      { id: 's6',  text: 'Are you currently in a major life transition?',                     type: 'select',
        options: ['Yes', 'No', 'Uncertain'] },
      { id: 's7',  text: 'What has been the dominant theme of the last three years?',         type: 'textarea', placeholder: 'What has most consumed your attention, energy, or emotional life?' },
      { id: 's8',  text: 'What is your primary intention for this reading?',                  type: 'textarea', placeholder: 'What do you most want to understand or clarify?' },
    ],
  },
  {
    title: 'Work and Purpose',
    questions: [
      { id: 's9',  text: 'How do you currently make a living?',                               type: 'textarea'  },
      { id: 's10', text: 'Does your work feel aligned with your sense of purpose?',           type: 'select',
        options: ['Strongly yes', 'Mostly yes', 'Uncertain', 'Mostly no', 'Strongly no'] },
      { id: 's11', text: 'What type of work or creative expression feels most natural to you?', type: 'textarea', placeholder: 'Not necessarily what you do for income — what pulls you.' },
      { id: 's12', text: 'Describe the area of work or contribution you keep returning to, even if it is not your job.', type: 'textarea' },
      { id: 's13', text: 'How has your professional drive shifted from your twenties to now?',  type: 'textarea' },
      { id: 's14', text: 'What feels unresolved or uncompleted in your professional life?',    type: 'textarea' },
    ],
  },
  {
    title: 'Relationships and Attachment',
    questions: [
      { id: 's15', text: 'Describe your current primary relationship, or the absence of one.', type: 'textarea' },
      { id: 's16', text: 'What patterns tend to repeat in your close relationships?',           type: 'textarea', placeholder: 'Patterns you notice across multiple relationships, not just one.' },
      { id: 's17', text: 'How do you typically respond when someone you love pulls away?',      type: 'textarea' },
      { id: 's18', text: 'How do you typically respond when someone gets too close?',           type: 'textarea' },
      { id: 's19', text: 'What does "home" feel like in your body — describe the physical sensation.', type: 'textarea' },
      { id: 's20', text: 'Describe the quality of your relationship with your mother.',         type: 'textarea' },
      { id: 's21', text: 'Describe the quality of your relationship with your father.',         type: 'textarea' },
      { id: 's22', text: 'Do you have children? If so, describe the dominant dynamic.',         type: 'textarea' },
      { id: 's23', text: 'What does intimacy feel like in your body — the approach and the aftermath?', type: 'textarea' },
      { id: 's24', text: 'What has been your most formative relational wound?',                  type: 'textarea' },
    ],
  },
  {
    title: 'The Body and Health',
    questions: [
      { id: 's25', text: 'Describe your overall physical health.',                             type: 'textarea' },
      { id: 's26', text: 'Where in your body do you carry stress most consistently?',          type: 'textarea' },
      { id: 's27', text: 'Do you have chronic physical symptoms that recur under pressure? Describe them.', type: 'textarea' },
      { id: 's28', text: 'What physical practice or movement feels most natural to you?',      type: 'textarea' },
      { id: 's29', text: 'How does your energy level fluctuate across the day or week?',       type: 'textarea' },
      { id: 's30', text: 'Have you experienced significant illness, injury, or surgery? Briefly describe.', type: 'textarea' },
    ],
  },
  {
    title: 'Mind and Shadow',
    questions: [
      { id: 's31', text: 'What is your most persistent self-critical thought?',                type: 'textarea' },
      { id: 's32', text: 'What behavior do you engage in that you wish you did not?',          type: 'textarea' },
      { id: 's33', text: 'What emotional response in yourself most surprises or troubles you?', type: 'textarea' },
      { id: 's34', text: 'Describe a situation where you acted against your own values.',       type: 'textarea' },
      { id: 's35', text: 'What area of life do you most avoid thinking about?',                type: 'textarea' },
      { id: 's36', text: 'What do people consistently misread about you?',                     type: 'textarea' },
      { id: 's37', text: 'What quality in others most irritates you?',                         type: 'textarea', placeholder: 'This often reflects something unacknowledged in ourselves.' },
      { id: 's38', text: 'What do you want most that you struggle to let yourself have?',       type: 'textarea' },
    ],
  },
  {
    title: 'Spiritual and Inner Life',
    questions: [
      { id: 's39', text: 'Do you have a spiritual or contemplative practice? Describe it.',    type: 'textarea' },
      { id: 's40', text: 'What does "meaning" or "purpose" feel like when you have it — physically?', type: 'textarea' },
      { id: 's41', text: 'Have you had experiences of deep clarity, synchronicity, or knowing that bypassed logic? Describe one.', type: 'textarea' },
      { id: 's42', text: 'What philosophical, spiritual, or psychological system has shaped you most?', type: 'textarea' },
      { id: 's43', text: 'Where do you feel most alive?',                                      type: 'textarea' },
      { id: 's44', text: 'What feels like your truest contribution to the world?',             type: 'textarea' },
    ],
  },
  {
    title: 'Timing and Life Phase',
    questions: [
      { id: 's45', text: 'How old are you right now, and does this age feel significant?',     type: 'textarea' },
      { id: 's46', text: 'What ended in the last two years?',                                  type: 'textarea' },
      { id: 's47', text: 'What began in the last two years?',                                  type: 'textarea' },
      { id: 's48', text: 'What are you building right now?',                                   type: 'textarea' },
      { id: 's49', text: 'What feels like the central question of this chapter of your life?', type: 'textarea' },
    ],
  },
  {
    title: 'For This Reading',
    description: 'These questions help focus the interpretation on what matters most to you right now.',
    questions: [
      { id: 's50', text: 'What do you most want this reading to clarify?',                     type: 'textarea', required: true },
      { id: 's51', text: 'Is there a decision you are currently facing? Describe it.',          type: 'textarea' },
      { id: 's52', text: 'What are you most afraid this reading might confirm?',               type: 'textarea' },
      { id: 's53', text: 'What are you most hoping this reading will show?',                   type: 'textarea' },
      { id: 's54', text: 'Is there a recurring life theme you want specifically addressed?',    type: 'textarea' },
      { id: 's55', text: 'Is there anything about your early life that feels formative and unresolved?', type: 'textarea' },
      { id: 's56', text: 'Is there a relationship you want this reading to speak to directly?', type: 'textarea' },
      { id: 's57', text: 'Is there a health, work, or financial matter you want addressed?',   type: 'textarea' },
      { id: 's58', text: 'What would a successful reading feel like?',                         type: 'textarea' },
      { id: 's59', text: 'Is there anything else you want to share before we begin?',          type: 'textarea' },
    ],
  },
]

// ─── RELATIONAL FORM — 42 questions + Person B birth data ────────────────────
// Products 5 (Synastry) and 6 (HD Composite)

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

export const RELATIONAL_SECTIONS: IntakeSection[] = [
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

// ─── PARENTING FORM — 33 questions + Child birth data ────────────────────────
// Products 7 (Parenting Astro) and 8 (Parenting HD)

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

export const PARENTING_SECTIONS: IntakeSection[] = [
  {
    title: 'Parent Context',
    description: 'Your own background helps frame how you are interpreting this child\'s chart.',
    questions: [
      { id: 'p1',  text: 'What is your role?',                                        type: 'select', required: true,
        options: ['Biological parent', 'Adoptive parent', 'Stepparent', 'Guardian', 'Grandparent', 'Other'] },
      { id: 'p2',  text: 'Do you co-parent with another adult? Briefly describe the arrangement.', type: 'textarea' },
      { id: 'p3',  text: 'Describe your own childhood in three sentences.',            type: 'textarea', required: true },
      { id: 'p4',  text: 'What did your parents do well?',                             type: 'textarea' },
      { id: 'p5',  text: 'What did your parents get wrong?',                           type: 'textarea' },
      { id: 'p6',  text: 'What pattern from your upbringing are you most determined not to repeat?', type: 'textarea' },
      { id: 'p7',  text: 'What pattern from your upbringing do you find yourself repeating despite your intention?', type: 'textarea' },
      { id: 'p8',  text: 'What does this child bring out in you that most surprises you?', type: 'textarea' },
      { id: 'p9',  text: 'What does this child need from you that you find hardest to give?', type: 'textarea' },
    ],
  },
  {
    title: "Your Child's Temperament",
    questions: [
      { id: 'p10', text: 'Describe your child\'s dominant personality in three sentences.',    type: 'textarea', required: true },
      { id: 'p11', text: 'What does your child do that most confuses or surprises you?',      type: 'textarea' },
      { id: 'p12', text: 'What does your child do that most delights you?',                   type: 'textarea' },
      { id: 'p13', text: 'What does your child do that most challenges you?',                 type: 'textarea' },
      { id: 'p14', text: 'How does your child handle conflict with others?',                   type: 'textarea' },
      { id: 'p15', text: 'How does your child handle transitions or change?',                  type: 'textarea' },
      { id: 'p16', text: 'How does your child express strong emotion?',                        type: 'textarea' },
      { id: 'p17', text: 'What does your child need most that you struggle to provide?',       type: 'textarea' },
    ],
  },
  {
    title: 'The Parent–Child Dynamic',
    questions: [
      { id: 'p18', text: 'Describe a typical good day with your child.',             type: 'textarea' },
      { id: 'p19', text: 'Describe a typical difficult day with your child.',         type: 'textarea' },
      { id: 'p20', text: 'Where do you and your child most easily connect?',         type: 'textarea' },
      { id: 'p21', text: 'Where do you and your child most consistently clash?',     type: 'textarea' },
      { id: 'p22', text: 'What do you misread about your child regularly?',          type: 'textarea' },
      { id: 'p23', text: 'What does your child need from you that you find hard to give?', type: 'textarea' },
      { id: 'p24', text: 'What are you most afraid of getting wrong as this child\'s parent?', type: 'textarea' },
      { id: 'p25', text: 'What do you most want your child to know about themselves?', type: 'textarea' },
    ],
  },
  {
    title: 'Developmental Context and What You Need',
    description: 'These questions help the reading address what is alive for your child and your relationship right now.',
    questions: [
      { id: 'p26', text: 'Is your child currently in a notable developmental phase or transition?', type: 'textarea' },
      { id: 'p27', text: 'Are there current behavioral or emotional challenges you are navigating?', type: 'textarea' },
      { id: 'p28', text: 'Are there learning differences, health considerations, or external circumstances relevant to this reading?', type: 'textarea' },
      { id: 'p29', text: 'How is your child\'s social life?',                        type: 'textarea' },
      { id: 'p30', text: 'What is the primary question you want this reading to answer?', type: 'textarea', required: true },
      { id: 'p31', text: 'What are you most afraid to discover about this dynamic?', type: 'textarea' },
      { id: 'p32', text: 'What would a successful parenting reading change or clarify for you?', type: 'textarea' },
      { id: 'p33', text: 'Is there anything else relevant to share before we begin?', type: 'textarea' },
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

export const RELATIONAL_QUESTION_LIST: IntakeQuestion[] = RELATIONAL_SECTIONS.flatMap(s => s.questions)
