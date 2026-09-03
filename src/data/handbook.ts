export type HandbookSection = {
  id: string;
  /** e.g. "1.1" — optional for unnumbered sections */
  number?: string;
  title: string;
  /** Lines: plain paragraph, "- bullet", or "@table" marker for the salary table. */
  body: string[];
};

export type HandbookGroup = {
  id: string;
  title: string;
  sections: HandbookSection[];
};

export const HANDBOOK_TITLE = "Tender Years of Deale LLC Employee Handbook";
export const HANDBOOK_SUBTITLE =
  "Dated April 22, 2026, updated September 3, 2026";

export const SALARY_TABLE: { position: string; requirements: string; pay: string }[] = [
  {
    position: "Director",
    requirements:
      "Must meet Maryland State requirements for Child Care Center Director, including required coursework, credentials, and experience in a licensed childcare setting.",
    pay: "Beginning at $22.00/hour",
  },
  {
    position: "Assistant Director",
    requirements:
      "Must meet Maryland State requirements for Assistant Director qualifications and demonstrate leadership and classroom management skills.",
    pay: "Beginning at $20.00/hour",
  },
  {
    position: "Lead Teacher (infants, toddlers, or preschool)",
    requirements:
      "Must possess a high school diploma or GED and meet Maryland State teacher qualification requirements through college coursework, credentialing, and/or experience.",
    pay: "Beginning at $19.00/hour",
  },
  {
    position: "School Age Teacher",
    requirements:
      "Must meet Maryland State requirements for school age childcare staff through education and/or experience.",
    pay: "Beginning at $19.00/hour",
  },
  {
    position: "Receptionist",
    requirements:
      "Must meet Maryland State requirements for childcare staff. Demonstrate professionalism, strong communication and organizational skills, confidentiality, dependability, and a friendly, service-oriented attitude.",
    pay: "Beginning at $15.00/hour",
  },
  {
    position: "Childcare Aide",
    requirements:
      "Supports classroom teachers. Must meet Maryland State requirements for childcare staff and demonstrate willingness to learn and work cooperatively.",
    pay: "Beginning at $15.00/hour",
  },
];

export const HANDBOOK: HandbookGroup[] = [
  {
    id: "core",
    title: "Core Policies",
    sections: [
      {
        id: "1-1",
        number: "1.1",
        title: "A Welcome Policy",
        body: [
          "Welcome! You have just joined a dedicated team of early childhood education professionals who recognize the important role each of us play in the life of a child.",
          "In our handbook, you will see that our polices are in place so that we can strive to provide all families with high-quality child care that grows the soul, heart, body and mind of every child. We are a faith-based team of professionals who feel a call to promote the development, learning, and well-being of all young children. Like the children, we too are life-long learners who strive to grow in the knowledge and love of the Lord.",
          "I am glad you are joining us! I pray that your employment with Tender Years of Deale, LLC fulfills your personal and professional calling as an early childhood education professional.",
          "Our Organization complies with all federal and state employment laws, and this handbook generally reflects those laws. The Organization also complies with any applicable local laws, although there may not be an express written policy regarding those laws contained in the handbook.",
          "The employment policies and/or benefits summaries in this handbook are written for all employees. When questions arise concerning the interpretation of these policies as they relate to employees who are covered by a collective-bargaining agreement, the answers will be determined by reference to the actual union contract, rather than the summaries contained in this handbook.",
          "Please take the time now to read this handbook carefully. Sign the acknowledgment at the end to show that you have read, understood, and agree to the contents of this handbook, which sets out the basic rules and guidelines concerning your employment. This handbook supersedes any previously issued handbooks or policy statements dealing with the subjects discussed herein. The Organization reserves the right to interpret, modify, or supplement the provisions of this handbook at any time. Neither this handbook nor any other communication by a management representative or other, whether oral or written, is intended in any way to create a contract of employment. Please understand that no employee handbook can address every situation in the workplace.",
          "If you have questions about your employment or any provisions in this handbook, please contact me.",
          "All the best,",
          "**Faith Wilkerson, Pastor** — Tender Years of Deale LLC",
        ],
      },
      {
        id: "1-2",
        number: "1.2",
        title: "At-Will Employment",
        body: [
          'Your employment with Tender Years of Deale LLC is on an "at-will" basis. This means your employment may be terminated at any time, with or without notice and with or without cause. Likewise, we respect your right to leave the Company at any time, with or without notice and with or without cause.',
          'Nothing in this handbook or any other Company document should be understood as creating a contract, guaranteed or continued employment, a right to termination only "for cause," or any other guarantee of continued benefits or employment. Only the Pastor has the authority to make promises or negotiate with regard to guaranteed or continued employment, and any such promises are only effective if placed in writing and signed by the Pastor.',
          "If a written contract between you and the Company is inconsistent with this handbook, the written contract is controlling.",
        ],
      },
      {
        id: "2-1",
        number: "2.1",
        title: "Ethics Code",
        body: [
          "All who work for TYD must uphold essential professional, ethical responsibilities to ensure that we are providing every child in our care with a positive emotional, social, cultural, and learning environment that is developmentally appropriate, cognitively stimulating, and that affirms, supports, values, and promotes all aspects of each child's growth. We refer to the NAEYC for our Code of Ethics within our profession.",
          "All staff will conduct business honestly and ethically wherever operations are maintained. We strive to improve the quality of our services, products, and operations and will maintain a reputation for honesty, fairness, respect, responsibility, integrity, trust, and sound business judgment. Our managers and employees are expected to adhere to high standards of business and personal integrity as a representation of our business practices, at all times consistent with their duty of loyalty to the Company.",
          "We expect that teachers, staff members, directors, and employees will not knowingly misrepresent the Company and will not speak on behalf of the Company unless specifically authorized. The confidentiality of trade secrets, proprietary information, and similar confidential commercially-sensitive information about the Company or operations, or that of our customers or partners, is to be treated with discretion and only disseminated on a need-to-know basis.",
          "Violation of the Ethics Code can result in discipline, up to and including termination of employment. The degree of discipline imposed may be influenced by the existence of voluntary disclosure of any ethical violation and whether or not the violator cooperated in any subsequent investigation.",
        ],
      },
      {
        id: "2-2",
        number: "2.2",
        title: "Our Organization",
        body: [
          '**Our Mission** — We provide a nurturing, safe child care environment that lays a strong foundation of the Christian faith for children during their "tender years" of childhood through literacy-rich play based learning opportunities.',
          "**Our Motto** — A Christian child care center where we love the Lord our God with all our heart, soul and mind..for the joy of the Lord is our strength. (Deuteronomy 6:4–9, Luke 10:27, Nehemiah 8:10)",
          "**Our Approach** — We believe that a literacy-rich, play-based, gospel-based, learning environment helps children of every age reach important developmental milestones, foster friendships and build Christian character.",
          "**Our Licensing** — Tender Years of Deale, LLC is a child care center regulated by the Maryland State Department of Education COMAR 13A.16 and licensed by the MSDE Office of Child Care Region 1.",
          "**Our Religious Affiliation** — The center is ecumenical and is operated by Reverend Faith Wilkerson, an ordained elder in the Global Methodist Church who serves as Pastor of Family & Youth Ministries at Cedar Grove Methodist Church, also located in Deale.",
          "**Total Inclusion Approach** — We ask that all employees understand and uphold our approach to total inclusion which is based on the biblical understanding that every child is a gift and that all children belong.",
        ],
      },
      {
        id: "2-3",
        number: "2.3",
        title: "Revisions to Handbook",
        body: [
          "This handbook is our attempt to keep you informed of the terms and conditions of your employment. The handbook is not a contract. The Company reserves the right to revise, add, or delete from this handbook as we determine to be in our best interest, except the policy concerning at-will employment. When changes are made, we will communicate them promptly, either in a written supplement or by posting.",
        ],
      },
      {
        id: "3-1",
        number: "3.1",
        title: "Accommodations for Pregnancy, Childbirth, and Related Medical Conditions",
        body: [
          "Tender Years of Deale LLC recognizes the importance of supporting employees experiencing limitations related to pregnancy, childbirth, or related medical conditions by providing reasonable accommodations, complying with the federal Pregnant Workers Fairness Act (PWFA) and applicable state/local laws.",
          "Examples of reasonable accommodations include:",
          "- Additional break time",
          "- Seating options",
          "- Schedule changes, part-time work, and paid/unpaid leave",
          "- Flexible work hours",
          "- Light duty",
          "- Job restructuring",
          "- Acquiring or modifying equipment",
          "If you require an accommodation, notify your Supervisor. The Company will engage in an interactive process with you to identify suitable accommodations. Retaliation against employees who request or utilize an accommodation under this policy is strictly prohibited.",
        ],
      },
      {
        id: "3-2",
        number: "3.2",
        title: "Conflicts of Interest",
        body: [
          "Tender Years of Deale LLC is concerned with conflicts of interest that create actual or potential job-related concerns. Disclose any actual or potential conflict of interest to your Supervisor.",
        ],
      },
      {
        id: "3-3",
        number: "3.3",
        title: "Disability Accommodation",
        body: [
          "Tender Years of Deale LLC complies with the ADA and applicable state/local fair employment laws, providing reasonable accommodation to qualified individuals with disabilities unless doing so creates an undue hardship. Notify your Supervisor if you require an accommodation. The Company will not discriminate or retaliate against employees for requesting an accommodation.",
        ],
      },
      {
        id: "3-4",
        number: "3.4",
        title: "Employment Authorization Verification",
        body: [
          "New hires complete Section 1 of federal Form I-9 on the first day of paid employment and must present acceptable documents proving identity/employment authorization within 3 business days.",
          "Also required:",
          "- W-4 Federal Form",
          "- MW507 (Maryland withholding)",
          "- MSDE Basic Health and Safety course",
          "- CPR/First Aid certification",
          "- OCC Form 1205 (Individual Personnel Information)",
          "- OCC Form 100 (Professional Coursework record)",
          "- Criminal Background Release (OCC-1260)",
          "- Noncriminal Justice Applicant's Privacy Rights",
          "- Medical Evaluation (OCC-1204, including TB test)",
          "- Criminal Background Check/Fingerprinting",
          "- Emergency Preparedness training reviewed with the Director at onboarding and each Fall",
        ],
      },
      {
        id: "3-5",
        number: "3.5",
        title: "New Hires and Introductory Periods",
        body: [
          "The first 90 days of employment is an introductory period during which the Company monitors performance and may adjust job responsibilities. Completion does not imply guaranteed employment; the relationship remains at-will throughout.",
        ],
      },
      {
        id: "3-6",
        number: "3.6",
        title: "Religious Accommodation",
        body: [
          "Tender Years of Deale LLC complies with Title VII and applicable laws prohibiting religious discrimination, and will reasonably accommodate sincerely held religious beliefs unless doing so creates undue hardship. Make requests to your Supervisor.",
        ],
      },
      {
        id: "4-1",
        number: "4.1",
        title: "Attendance",
        body: [
          "Regular and punctual attendance is required. If running late or absent, notify the Director as soon as possible — you may text, but **YOU MUST TALK TO THE DIRECTOR** to confirm she received your notice. If you fail to report for 3+ consecutive days without notification, the Company will assume voluntary resignation.",
        ],
      },
      {
        id: "4-1a",
        number: "4.1a",
        title: "Collaboration and Staff Meetings",
        body: [
          "Staff are expected to attend scheduled staff meetings and monthly planning meetings. Brief Check-in Meetings with the Director are held the 2nd and 4th Tuesdays of each month, 1:30–2:30pm. Failure to consistently participate in meetings or required training may affect employment status.",
        ],
      },
      {
        id: "4-2",
        number: "4.2",
        title: "Direct Deposit",
        body: [
          "All employees must enroll in direct deposit. Provide a voided check at hiring. Direct deposit typically begins within 30 calendar days of application.",
        ],
      },
      {
        id: "4-3",
        number: "4.3",
        title: "Employment Classifications",
        body: [
          "Employees are classified exempt or nonexempt, and as regular full-time (40+ hrs/week), regular part-time (<40 hrs/week), or temporary/seasonal. Classifications do not alter at-will status.",
        ],
      },
      {
        id: "4-3b",
        number: "4.3b",
        title: "Salary Scale and Classifications",
        body: [
          "Tender Years of Deale strives to offer competitive wages based on education, experience, position responsibilities, and Maryland State licensing qualifications.",
          "@table",
        ],
      },
      {
        id: "4-4",
        number: "4.4",
        title: "Paycheck Deductions",
        body: [
          "The Company makes legally required deductions (federal/state income tax, FICA, etc.). Review your paycheck each pay period and report discrepancies to your Supervisor immediately. Isolated or improper deductions are reimbursed in full, no later than the next regular payday.",
        ],
      },
      {
        id: "4-5",
        number: "4.5",
        title: "Recording Time",
        body: [
          'Nonexempt employees must record all working time using the Company timekeeping application, clocking in no more than 5 minutes before and out no more than 5 minutes after actual work times. Falsifying time entries, including working "off the clock," is strictly prohibited.',
        ],
      },
      {
        id: "5-1",
        number: "5.1",
        title: "Criminal Activity/Arrests",
        body: [
          "Involvement in criminal activity while employed, on or off Company property, may result in disciplinary action including suspension or termination.",
        ],
      },
      {
        id: "5-2",
        number: "5.2",
        title: "Disciplinary Process",
        body: [
          "Violations may result in demotion, transfer, leave without pay, or termination. The Company encourages progressive discipline (verbal warning, written warnings, then further action) but is not required to follow it and may terminate at any time consistent with at-will status.",
        ],
      },
      {
        id: "5-3",
        number: "5.3",
        title: "Open Door/Conflict Resolution Process",
        body: [
          "Bring problems, concerns, or grievances to your Supervisor first, then to Human Resources or upper management if unresolved.",
        ],
      },
      {
        id: "5-4",
        number: "5.4",
        title: "Outside Employment",
        body: [
          "Outside employment that creates a conflict of interest or affects work performance is prohibited. Report any outside employment to your Supervisor. While on a leave of absence, you may not work for yourself or another employer.",
        ],
      },
      {
        id: "5-5",
        number: "5.5",
        title: "Performance Reviews",
        body: [
          "Reviews are held between 60–90 days of employment and then annually, evaluating job performance, goal achievement, and professionalism. A positive review does not guarantee a raise or continued employment.",
        ],
      },
      {
        id: "5-6",
        number: "5.6",
        title: "Resignation Policy",
        body: [
          "**Notice** — The Company requests a minimum of two weeks' written notice. Less notice may affect rehire eligibility.",
          "**Final Pay** — Paid in accordance with applicable laws.",
          "**Return of Property** — Return all Company property at separation; failure may result in deductions where state law allows.",
        ],
      },
      {
        id: "5-7",
        number: "5.7",
        title: "Standards of Conduct",
        body: [
          "Examples of inappropriate conduct that could result in discipline up to immediate termination include:",
          "- Violating this handbook or the Family Handbook (including improper screen time/technology use)",
          "- Possessing or being under the influence of illegal drugs/alcohol on duty",
          "- Inaccurate time/hour reporting",
          "- Taking or destroying Company property",
          "- Possession of hazardous items without authorization",
          "- Fighting or harassment",
          "- Disclosure of trade secrets",
          "- Refusal to follow directions or safety rules",
          "- Excessive tardiness/absences",
          "- Smoking in nondesignated areas",
          "- Unauthorized overtime",
          "- Solicitation during work hours",
          "- Dress code violations",
          "- Obscene/harassing language",
          "- Conflicting outside employment",
          "- Gambling on premises",
          "- Lending keys/keycards to unauthorized persons",
        ],
      },
      {
        id: "6-1",
        number: "6.1",
        title: "Employer Sponsored Social Events",
        body: [
          "Attendance at Company social events is voluntary. If alcohol is available and you choose to drink, do so responsibly — never drink and drive.",
        ],
      },
      {
        id: "6-2",
        number: "6.2",
        title: "Nonsolicitation/Nondistribution Policy",
        body: [
          "Soliciting other employees during working hours is prohibited (permitted during nonworking time like breaks). Distribution of nonwork literature in working areas is prohibited at all times. Report violations to your Supervisor.",
        ],
      },
      {
        id: "6-3",
        number: "6.3",
        title: "Personal Appearance",
        body: [
          "Employees must report to work neatly groomed and appropriately dressed. Not permitted:",
          "- Showing of navel/midsection",
          "- Shorts more than 3 inches above the knee (warmer months)",
          "- Pajama bottoms",
          "- T-shirts with derogatory slogans",
          "- Street shoes in infant rooms",
          "Fragrant products should be used in moderation. Reasonable accommodation is available for disability or religious beliefs.",
        ],
      },
      {
        id: "6-4",
        number: "6.4",
        title: "Personal Cell Phone/Mobile Device Use",
        body: [
          "Personal devices are permitted but must not interfere with job duties. Use primarily during nonworking time. Camera/recording functions are restricted without authorization. Vehicle use while driving on work time must be hands-free or pulled over.",
          "**Parent Communication (added September 3, 2026)** — Brightwheel is the primary channel for parent communication. Teachers and staff are not to share their personal cell phone numbers with parents or communicate with parents through personal cell phones, personal social media, or personal messaging apps. Parents needing to reach a staff member should contact the center directly by phone or through Brightwheel. Ms. Faith's personal cell phone remains available for direct parent contact with her.",
          "Violation of this policy is subject to disciplinary action up to and including termination.",
        ],
      },
      {
        id: "6-5",
        number: "6.5",
        title: "Personal Data Changes",
        body: [
          "Keep your contact information and tax withholding status current with the Company. Contact Payroll to make changes.",
        ],
      },
      {
        id: "6-6",
        number: "6.6",
        title: "Social Media",
        body: [
          "Use good judgment — assume anything posted could be seen by colleagues, supervisors, or customers. Protect trade secrets and confidential information; avoid defamatory statements, threats, or harassment; don't link personal accounts as an official Company source. Do not use social media on work time unless work-related and authorized. Children should not have access to staff cell phones. Direct all media inquiries to the Pastor.",
        ],
      },
      {
        id: "6-7",
        number: "6.7",
        title: "Third Party Disclosures",
        body: [
          "Do not speak on behalf of the Company to lawyers, media, or law enforcement regarding news stories or legal proceedings — refer such calls to the Pastor.",
        ],
      },
      {
        id: "6-8",
        number: "6.8",
        title: "Workplace Privacy and Right to Inspect",
        body: [
          "Company property (lockers, phones, computers, desks, vehicles) remains under Company control and is subject to inspection at any time without notice. Employees have no expectation of privacy in these areas.",
        ],
      },
      {
        id: "7-1",
        number: "7.1",
        title: "401(k) Plan",
        body: [
          "Eligible employees may participate in the 401(k) plan after any applicable waiting period. Contact the Director for eligibility requirements.",
        ],
      },
      {
        id: "7-2",
        number: "7.2",
        title: "Continuing Education and Tuition Assistance",
        body: [
          "All employees must complete the annual Basic Health and Safety Update through MSDE, plus Core Knowledge training annually at an approved provider.",
          "Tuition reimbursement may be available for advanced 45-Hour classes or Core Knowledge Courses. Any employee provided tuition support must remain employed beyond 365 days or will be required to pay back the coursework cost. Discuss with the Director.",
          "All staff are encouraged to apply for the Maryland Child Care Credential Program.",
        ],
      },
      {
        id: "7-3",
        number: "7.3",
        title: "Employee Assistance Program (EAP)",
        body: [
          "Confidential counseling access for eligible employees and dependents after the waiting period. Contact: 1-800-960-5371 or www.nexgeneap.com, Company ID PAS220. EAP services are free; outside treatment referral costs are the employee's responsibility if not covered by insurance.",
        ],
      },
      {
        id: "7-4",
        number: "7.4",
        title: "Holidays",
        body: [
          "Paid holidays: New Year's Eve, New Year's Day, MLK Jr. Day, President's Day, Good Friday, Memorial Day, Fourth of July, Summer Recess, Labor Day, Thanksgiving, Day after Thanksgiving, Christmas Eve, Christmas Day, Day After Christmas.",
          "**Christmas, Easter & New Year's Note** — Holiday time off at Christmas, Easter, and New Year's varies and is determined annually according to the date the holiday falls and when school is out.",
          "When a holiday falls on a Saturday, it's observed the preceding Friday; on a Sunday, the following Monday. Each summer, the center closes for 1 week (Summer Recess) — salaried staff and hourly staff past their 90-day introductory period working 30+ hours are paid during this week.",
        ],
      },
      {
        id: "7-5",
        number: "7.5",
        title: "Jury Duty Leave",
        body: [
          "Notify your Supervisor as soon as possible if summoned. Time is generally unpaid unless law requires compensation; PTO may be substituted.",
        ],
      },
      {
        id: "7-6",
        number: "7.6",
        title: "Military Leave (USERRA)",
        body: [
          "The Company complies with USERRA and applicable state law regarding military leave and re-employment rights.",
        ],
      },
      {
        id: "7-7",
        number: "7.7",
        title: "Paid Time Off (PTO)",
        body: [
          "**Eligibility** — All full-time exempt employees are eligible immediately upon hire.",
          "**Deposits** — Calculated annually; 40 hours per year.",
          "**Leave Usage and Requests** — Request at least 5 days in advance.",
          "**Carryover** — Unused PTO does not carry over and is forfeited at year end.",
          "**Separation of Employment** — Unused PTO is forfeited upon separation.",
          "**Holiday Blackout (effective August 13, 2026)** — PTO may not be used for the workday immediately before or immediately following a Company-observed paid holiday. This applies to observed dates including holidays shifted for weekends. Requests falling on a blackout day will not be approved except for documented emergencies or as legally required. This policy helps ensure adequate staffing and ratio coverage around paid holidays.",
        ],
      },
      {
        id: "7-8",
        number: "7.8",
        title: "Unemployment Compensation Insurance",
        body: [
          "Paid for by the Company, providing temporary income for employees who lose their job under certain circumstances.",
        ],
      },
      {
        id: "7-9",
        number: "7.9",
        title: "Workers' Compensation Insurance",
        body: [
          "No-fault system covering medical treatment and lost wages for work-related injuries. Report any injury to your Supervisor immediately.",
        ],
      },
      {
        id: "8-1",
        number: "8.1",
        title: "Business Closure and Emergencies",
        body: [
          "The Company will attempt to notify you of closures by phone, text, or email. Pay treatment during closures depends on exempt/nonexempt status and timing of notification, per the handbook and applicable law.",
        ],
      },
      {
        id: "8-2",
        number: "8.2",
        title: "Drug and Alcohol Policy",
        body: [
          "The Company maintains a drug and alcohol-free workplace. Being under the influence of alcohol, illegal drugs, or impairing substances while on duty is prohibited. Marijuana remains illegal under federal law regardless of state legalization; medical marijuana prescriptions should be discussed under the Disability Accommodation policy.",
        ],
      },
      {
        id: "8-3",
        number: "8.3",
        title: "General Safety",
        body: [
          "All employees are responsible for maintaining a safe work environment and reporting hazards. Report occupational illness/injury to your Supervisor as soon as possible.",
        ],
      },
      {
        id: "8-4",
        number: "8.4",
        title: "Workplace Tobacco Usage",
        body: [
          "Smoking (including e-cigarettes/vaping) and smokeless tobacco are prohibited in Company offices, vehicles, client areas, restrooms, and other designated areas.",
        ],
      },
      {
        id: "8-5",
        number: "8.5",
        title: "Workplace Violence",
        body: [
          "**Zero Tolerance Policy** — The Company has zero tolerance for workplace violence, threats, harassment, or intimidation. Report any concerning behavior to your Supervisor immediately; reports are investigated and kept confidential to the extent possible.",
        ],
      },
      {
        id: "9-1",
        number: "9.1",
        title: "Confidentiality and Nondisclosure of Trade Secrets",
        body: [
          "Employees must protect Company trade secrets and confidential commercially-sensitive information on a need-to-know basis. Violation may result in termination and civil liability.",
        ],
      },
      {
        id: "9-2",
        number: "9.2",
        title: "Confidentiality of Child and Family Information (added September 3, 2026)",
        body: [
          "Employees have access to sensitive information about the children and families in our care, including enrollment records, health and medical information, developmental and behavioral records, custody and legal documentation, financial/tuition records, and photos or video of children. This information must be treated as strictly confidential.",
          '**Access and Use** — Child and family information may only be accessed and used for legitimate job-related purposes, on a "need to know" basis. It may not be shared with anyone outside the Company, including other parents, family members of staff, or on personal social media or messaging platforms, without written parental consent or as required by law.',
          "**Discussion** — Do not discuss a child's behavior, health, family situation, or any other confidential matter in front of other children, other families, or in public/common areas. Conversations about a specific child or family should take place privately with the Director or relevant staff only.",
          "**Photos and Records** — Photos, videos, and records of children may only be used for authorized Company purposes (e.g., Brightwheel updates, approved center marketing with signed release) and may not be taken, stored, or shared using personal devices or personal social media accounts.",
          "**Records Storage** — Physical and digital child records must be kept secure (locked files or password-protected systems) and accessed only by authorized personnel.",
          "**Exceptions** — This policy does not prevent or restrict any mandated reporting obligation to Child Protective Services, law enforcement, or the Maryland Office of Child Care.",
          "Violation of this policy may result in disciplinary action up to and including termination.",
        ],
      },
      {
        id: "10-1",
        number: "10.1",
        title: "Customer, Client, and Visitor Relations",
        body: [
          "Treat every customer, client, or visitor with respect and courtesy. Notify your Supervisor of any problems or concerns voiced regarding products or services.",
        ],
      },
    ],
  },
  {
    id: "maryland",
    title: "Maryland Policies",
    sections: [
      {
        id: "md-eeo",
        title: "EEO Statement and Nonharassment Policy",
        body: [
          "The Company is committed to equal employment opportunity and maintains a work environment free of harassment, discrimination, or retaliation based on protected characteristics (age, race, color, national origin, religion, sex, sexual orientation, gender identity, pregnancy, marital status, disability, genetic information, veteran status, and more).",
          "**Sexual Harassment** — Unwelcome sexual advances, requests for sexual favors, or other conduct of a sexual nature are strictly prohibited.",
          "**Reporting Discrimination and Harassment** — Immediately notify the relations committee at 301-580-8147. Retaliation is prohibited. Claims are investigated promptly and confidentially. Discipline for violations may include reprimand, suspension, demotion, transfer, and discharge.",
        ],
      },
      {
        id: "md-nursing",
        title: "Accommodations for Nursing Mothers",
        body: [
          "The Company provides reasonable break time and a private space (not a restroom) to express milk for up to one year following birth. Break time may be unpaid where legally permissible.",
        ],
      },
      {
        id: "md-meal",
        title: "Meal and Rest Periods",
        body: [
          "The Company complies with federal and state meal/rest period regulations. Notify your Supervisor if you're unable to take a scheduled break.",
        ],
      },
      {
        id: "md-overtime",
        title: "Overtime",
        body: [
          "Nonexempt employees may qualify for overtime pay (1.5x regular rate for hours over 40/week), approved in advance in writing by your Supervisor.",
        ],
      },
      {
        id: "md-payperiod",
        title: "Pay Period",
        body: [
          "Biweekly, paid every other Friday. If a pay date falls on a holiday, you're paid the preceding workday.",
        ],
      },
      {
        id: "md-records",
        title: "Access to Personnel and Medical Records Files",
        body: [
          "Medical records are stored separately from personnel files, in a locked location, accessed on a need-to-know basis. Contact the Director for file review requests.",
        ],
      },
      {
        id: "md-court",
        title: "Court Attendance and Witness Leave",
        body: ["Unpaid leave is provided if subpoenaed to testify; PTO may be substituted."],
      },
      {
        id: "md-crime",
        title: "Crime Victim Leave",
        body: [
          "Unpaid leave (PTO may be substituted) is available to crime victims or their representatives to attend related proceedings.",
        ],
      },
      {
        id: "md-phe",
        title: "Public Health Emergency Leave for Essential Workers",
        body: [
          "Provided in accordance with the Maryland Essential Workers' Protection Act for eligible essential employees during declared emergencies.",
        ],
      },
      {
        id: "md-sick",
        title: "Unpaid Sick Leave",
        body: [
          "Provided under Maryland's Healthy Working Families Act to employees working 40+ hours/week regularly, for personal or family illness, maternity/paternity leave, or domestic violence/sexual assault/stalking related absences. Notify by texting Pastor Faith as soon as practical if unforeseeable.",
        ],
      },
      {
        id: "md-voting",
        title: "Voting Leave",
        body: [
          "Reasonable paid time off to vote is provided if your schedule prevents voting on Election Day, at your Supervisor's discretion.",
        ],
      },
    ],
  },
  {
    id: "abuse-prevention",
    title: "Child Abuse and Sexual Molestation Prevention Policy",
    sections: [
      {
        id: "ab-purpose",
        title: "Purpose",
        body: [
          "*(added 4.21.2026)*",
          "To protect children, staff, and volunteers from abuse and sexual molestation, establish clear reporting procedures, and ensure compliance with applicable state/federal laws.",
        ],
      },
      {
        id: "ab-zero",
        title: "Zero Tolerance Statement",
        body: [
          "TYD prohibits and has **ZERO TOLERANCE** for any form of child sexual abuse, molestation, or sexual misconduct, by staff, volunteers, contractors, or third parties at any time.",
        ],
      },
      {
        id: "ab-def",
        title: "Definitions",
        body: [
          "- **Child Sexual Abuse** — Any sexual act involving a child, including touching, penetration, exploitation, or coercion.",
          "- **Sexual Misconduct** — Any inappropriate sexual behavior or advances toward a child.",
        ],
      },
      {
        id: "ab-prevention",
        title: "Prevention Measures",
        body: [
          "- All staff/volunteers complete Basic Health and Safety or equivalent sexual abuse prevention training.",
          "- Mandatory background checks (including fingerprinting) for all employees and volunteers.",
          "- Criminal history screening through FBI and State of Maryland.",
          "- Clear boundaries and supervision protocols for all children.",
        ],
      },
      {
        id: "ab-reporting",
        title: "Reporting Procedures",
        body: [
          "**Who must report** — All staff, volunteers, board members, and anyone with knowledge of suspected abuse must report immediately.",
          "**Where to report** — Child Protective Services. In emergencies, call 911 and CPS at 410-974-8700.",
          "**How to report** — Oral report to the Director or designated agent; if unavailable, the next available supervisor; if none available, contact CPS or law enforcement directly.",
          "**Confidentiality** — Reports are handled confidentially in accordance with state law.",
        ],
      },
      {
        id: "ab-investigation",
        title: "Investigation and Action",
        body: [
          "Any confirmed violation results in immediate termination, reporting to authorities, and prosecution to the fullest extent of the law.",
        ],
      },
      {
        id: "ab-training",
        title: "Training and Review",
        body: ["Reviewed annually. All staff and volunteers are trained at hire and annually."],
      },
      {
        id: "ab-ack",
        title: "Acknowledgement",
        body: [
          "All staff and volunteers must acknowledge receipt and understanding of this policy by signing the staff handbook or a separate acknowledgment form.",
        ],
      },
    ],
  },
  {
    id: "acknowledgment",
    title: "Acknowledgment of Receipt and Review",
    sections: [
      {
        id: "ack-main",
        title: "Acknowledgment of Receipt and Review",
        body: [
          "By signing, an employee acknowledges receiving a copy of the Tender Years of Deale LLC Employee Handbook, having read and understood it, and agreeing to comply with it. The Company has maximum discretion to interpret, administer, change, modify, or delete the handbook's rules, regulations, procedures, and benefits at any time, with or without notice. No statement or representation by a supervisor, manager, or any other employee, oral or written, can supplement or modify this handbook — changes can only be made if approved in writing by the Pastor.",
          'This handbook does not create a contract of employment. Employment is "at-will" (to the extent permitted by law) and this handbook does not modify at-will status.',
          "This handbook is not intended to preclude or dissuade employees from engaging in legally protected activities under the NLRA.",
          "This handbook supersedes any previous handbook or policy statements, whether written or oral, issued by Tender Years of Deale LLC.",
          "@signature",
        ],
      },
    ],
  },
];
