// ============================================================
//  31594 — Ai Matter Workspace : dataset
//  Feeds three things:
//    1. the search index (search.js)      — any-criteria matter lookup
//    2. the workload engine (workload.js) — task pool the AI draws from
//    3. the matter tabs (app.js)          — opening a matter from search
//  Card copy is taken verbatim from the Figma frames so the
//  loaded state renders identically to node 5548:486991.
// ============================================================
window.HALO = window.HALO || {};

HALO.user = { firstName: 'Harry', openMatters: 103 };

// ------------------------------------------------------------
//  Client matters. Every field here is searchable — reference,
//  client, description, matter area, the area the matter used to
//  sit under, fee earner, office, property address, postcode,
//  status, phone, email, dates and value.
// ------------------------------------------------------------
HALO.matters = [
  {
    ref: 'A1662/2', client: 'Holly Jonson', salutation: 'Ms H Jonson',
    description: 'Purchase of Land',
    area: 'Commercial / Banking and Asset Finance',
    previousArea: 'Advocacy / General',
    feeEarner: 'Sarah Gillingham', office: 'Guildford',
    address: 'Land north of Wickham Avenue, Guildford', postcode: 'GU1 3PB',
    status: 'Open', phone: '07700 900118', email: 'holly.jonson@example.com',
    openedOn: '11 Feb 2026', keyDate: '30 Sep 2026', value: 1250000, recent: true,
  },
  {
    ref: 'A25/1', client: 'Adrian Adamson', salutation: 'Mr A Adamson',
    description: 'Purchase 8 Bloomsbury Court',
    area: 'Property / Residential', previousArea: null,
    feeEarner: 'Guy Setford', office: 'Guildford',
    address: '8 Bloomsbury Court, Guildford', postcode: 'GU1 4TN',
    status: 'Open', phone: '07700 900412', email: 'a.adamson@example.com',
    openedOn: '03 Mar 2026', keyDate: '12 Sep 2026', value: 485000, recent: true,
  },
  {
    ref: 'A204/3', client: 'Jennifer Moir Allen', salutation: 'Mrs J Moir Allen',
    description: 'Purchase of 17 Wickham Avenue',
    area: 'Property / Residential', previousArea: null,
    feeEarner: 'Sarah Gillingham', office: 'Farnham',
    address: '17 Wickham Avenue, Farnham', postcode: 'GU9 8LD',
    status: 'Closing', phone: '07700 900233', email: 'j.moirallen@example.com',
    openedOn: '19 Jan 2026', keyDate: '05 Sep 2026', value: 610000, recent: true,
  },
  {
    ref: 'A204/4', client: 'Jennifer Moir Allen', salutation: 'Mrs J Moir Allen',
    description: 'Sale of 8 Home Croft Drive',
    area: 'Property / Residential', previousArea: null,
    feeEarner: 'Sarah Gillingham', office: 'Farnham',
    address: '8 Home Croft Drive, Farnham', postcode: 'GU9 7RR',
    status: 'Closing', phone: '07700 900233', email: 'j.moirallen@example.com',
    openedOn: '19 Jan 2026', keyDate: '05 Sep 2026', value: 430000, recent: true,
  },
  {
    ref: 'P124/1', client: 'Pinewood Holdings Ltd', salutation: 'Pinewood Holdings Ltd',
    description: 'Sale of Pinewood Industrial Unit',
    area: 'Property / Commercial', previousArea: 'Corporate / Advice',
    feeEarner: 'Fiasal Aslam', office: 'Woking',
    address: 'Unit 4 Pinewood Estate, Woking', postcode: 'GU21 5BJ',
    status: 'Open', phone: '01483 900771', email: 'accounts@pinewoodholdings.example',
    openedOn: '07 Nov 2025', keyDate: '22 Sep 2026', value: 2100000, recent: true,
  },
  {
    ref: 'B12/2', client: 'Hale Estate', salutation: 'Executors of Mrs B Hale',
    description: 'Estate of Mrs Beatrice Hale',
    area: 'Probate / Estates', previousArea: null,
    feeEarner: 'Paul Reynolds', office: 'Guildford',
    address: '22 Ferndown Close, Guildford', postcode: 'GU2 8AA',
    status: 'Open', phone: '07700 900655', email: 'executors@haleestate.example',
    openedOn: '14 Aug 2025', keyDate: '18 Sep 2026', value: 780000, recent: false,
  },
  {
    ref: '110/1', client: '121E143LH Ltd', salutation: '121E143LH Ltd',
    description: 'Ground Floor Retail Unit Lease',
    area: 'Property / Commercial', previousArea: null,
    feeEarner: 'Fiasal Aslam', office: 'Woking',
    address: '143 Lower High Street, Woking', postcode: 'GU21 6LH',
    status: 'Open', phone: '01483 900140', email: 'legal@121e143lh.example',
    openedOn: '22 Apr 2026', keyDate: '11 Nov 2026', value: 96000, recent: false,
  },
  {
    ref: '60002/1', client: '65 Garratt Terrace Freehold Ltd', salutation: 'The Directors',
    description: 'Purchase of the Freehold',
    area: 'Property / Commercial', previousArea: 'Landlord & Tenant / Enfranchisement',
    feeEarner: 'Paul Reynolds', office: 'London',
    address: '65 Garratt Terrace, London', postcode: 'SW17 0LT',
    status: 'Open', phone: '020 7900 4412', email: 'directors@garratt65.example',
    openedOn: '02 Jun 2026', keyDate: '29 Sep 2026', value: 315000, recent: false,
  },
  {
    ref: 'A8/7', client: 'Mark Appleton', salutation: 'Mr M Appleton',
    description: 'Dispute with Mrs Mayhew',
    area: 'Litigation / General', previousArea: null,
    feeEarner: 'Tessie Bennett', office: 'Farnham',
    address: '4 Mayhew Lane, Farnham', postcode: 'GU9 9DT',
    status: 'Open', phone: '07700 900901', email: 'm.appleton@example.com',
    openedOn: '30 Sep 2025', keyDate: '02 Oct 2026', value: 45000, recent: false,
  },
  {
    ref: 'A252/1', client: 'Annette Alderson', salutation: 'Mrs A Alderson',
    description: 'Property litigation Forsythe matter',
    area: 'Litigation / Property', previousArea: 'Advocacy / General',
    feeEarner: 'Greg Barrett', office: 'Guildford',
    address: '9 Forsythe Gardens, Guildford', postcode: 'GU1 2QH',
    status: 'Open', phone: '07700 900318', email: 'a.alderson@example.com',
    openedOn: '12 Dec 2025', keyDate: '16 Oct 2026', value: 68000, recent: false,
  },
  {
    ref: 'A419/3', client: 'David Anderson', salutation: 'Mr D Anderson',
    description: 'Lease extension and consent',
    area: 'Landlord & Tenant / Residential', previousArea: null,
    feeEarner: 'Natalie Thorne', office: 'London',
    address: 'Flat 12, Ashdown House, London', postcode: 'SE1 4YN',
    status: 'Open', phone: '020 7900 8823', email: 'd.anderson@example.com',
    openedOn: '05 May 2026', keyDate: '24 Sep 2026', value: 22000, recent: false,
  },
  {
    ref: 'A1/1', client: 'Mohamed Alsheban', salutation: 'Mr M Alsheban',
    description: 'Purchase of 14 Durham Road',
    area: 'Property / Residential', previousArea: null,
    feeEarner: 'Guy Setford', office: 'London',
    address: '14 Durham Road, London', postcode: 'N7 7DS',
    status: 'Open', phone: '020 7900 3311', email: 'm.alsheban@example.com',
    openedOn: '18 Jul 2026', keyDate: '07 Oct 2026', value: 725000, recent: false,
  },
  {
    ref: 'F11/9', client: 'Greenway Retail', salutation: 'Greenway Retail Ltd',
    description: 'Lease renewal — 22 High Street',
    area: 'Landlord & Tenant / Commercial', previousArea: null,
    feeEarner: 'Natalie Thorne', office: 'Woking',
    address: '22 High Street, Woking', postcode: 'GU21 6BQ',
    status: 'Reopening', phone: '01483 900620', email: 'estates@greenwayretail.example',
    openedOn: '09 Sep 2025', keyDate: '01 Dec 2026', value: 54000, recent: false,
  },
  {
    ref: 'C99/4', client: 'Marcus Smith', salutation: 'Mr M Smith',
    description: 'Reopen — Smith v Jones',
    area: 'Litigation / General', previousArea: 'Advocacy / General',
    feeEarner: 'Tessie Bennett', office: 'Farnham',
    address: '31 Jones Street, Farnham', postcode: 'GU9 7HH',
    status: 'Reopening', phone: '07700 900774', email: 'm.smith@example.com',
    openedOn: '21 Feb 2026', keyDate: '13 Oct 2026', value: 31000, recent: false,
  },
  {
    ref: 'E07/2', client: 'Lambert & Co', salutation: 'Lambert & Co',
    description: 'Old retainer — Lambert',
    area: 'Corporate / Advice', previousArea: null,
    feeEarner: 'Greg Barrett', office: 'London',
    address: '7 Lambert Court, London', postcode: 'EC2A 3JX',
    status: 'Closed', phone: '020 7900 1120', email: 'office@lambertco.example',
    openedOn: '04 Mar 2025', keyDate: null, value: 12000, recent: false,
  },
];

// ------------------------------------------------------------
//  The rest of the caseload — 88 more matters, so the matter
//  picker and the search bar cover all 103 open files rather
//  than just the handful the designs name. Same shape as the
//  detailed matters above; every field is searchable.
// ------------------------------------------------------------
HALO.matters = HALO.matters.concat([
  { ref: 'U205/4', client: 'Freya Underhill', salutation: 'Ms Underhill', description: 'Child arrangements — Underhill', area: 'Family / Children', previousArea: 'Corporate / Advice', feeEarner: 'Crispin Dale', office: 'Woking', address: '177 Bramble Lane, Woking', postcode: 'GU21 6UH', status: 'Closing', phone: '07700 979808', email: 'f.underhill@example.com', openedOn: '06 Apr 2025', keyDate: '24 Jul 2027', value: 60000, recent: false },
  { ref: 'J350/2', client: 'Yasmin Jarrold', salutation: 'Ms Jarrold', description: 'Refinance of Mereside Estate', area: 'Property / Commercial', previousArea: null, feeEarner: 'Tessie Bennett', office: 'Farnham', address: '23 Abbey Road, Farnham', postcode: 'GU9 3UR', status: 'Reopening', phone: '07700 993660', email: 'y.jarrold@example.com', openedOn: '25 Oct 2025', keyDate: '02 Mar 2026', value: 685000, recent: false },
  { ref: 'Q611/4', client: 'Quarrywood Holdings Ltd', salutation: 'Quarrywood Holdings Ltd', description: 'Share sale — Quarrywood Holdings', area: 'Corporate / M&A', previousArea: null, feeEarner: 'Greg Barrett', office: 'Winchester', address: '174 Abbey Road, Winchester', postcode: 'SO23 1SW', status: 'Open', phone: '01483 936818', email: 'office@quarrywood.example', openedOn: '16 Mar 2026', keyDate: '20 May 2026', value: 1190000, recent: false },
  { ref: 'R229/3', client: 'Beth Rathbone', salutation: 'Dr Rathbone', description: 'Inheritance Act claim — Rathbone', area: 'Probate / Contentious', previousArea: null, feeEarner: 'Dan Whitfield', office: 'Woking', address: '104 Lynton Road, Woking', postcode: 'GU21 2WJ', status: 'Reopening', phone: '07700 947938', email: 'b.rathbone@example.com', openedOn: '16 Jul 2025', keyDate: '01 Apr 2027', value: 480000, recent: false },
  { ref: 'D213/1', client: 'Bridget Drinkwater', salutation: 'Mrs Drinkwater', description: 'Dilapidations claim — 160 Juniper Rise', area: 'Litigation / Property', previousArea: null, feeEarner: 'Paul Reynolds', office: 'Woking', address: '160 Juniper Rise, Woking', postcode: 'GU21 8PJ', status: 'Closing', phone: '07700 996090', email: 'b.drinkwater@example.com', openedOn: '18 Sep 2025', keyDate: null, value: 95000, recent: false },
  { ref: 'H486/2', client: 'Iain Holbrook', salutation: 'Dr Holbrook', description: 'CGT advice — Holbrook', area: 'Private Client / Tax', previousArea: 'Corporate / Advice', feeEarner: 'Paul Reynolds', office: 'Reading', address: '10 Tanners Row, Reading', postcode: 'RG1 7PT', status: 'Open', phone: '07700 998033', email: 'i.holbrook@example.com', openedOn: '07 Oct 2025', keyDate: '12 Jun 2026', value: 150000, recent: false },
  { ref: 'G529/2', client: 'Freya Gledhill', salutation: 'Ms Gledhill', description: 'Collective enfranchisement — Oakhanger House', area: 'Landlord & Tenant / Enfranchisement', previousArea: null, feeEarner: 'Marcus Ellery', office: 'Winchester', address: '87 Lynton Road, Winchester', postcode: 'SO23 4XN', status: 'Open', phone: '07700 972132', email: 'f.gledhill@example.com', openedOn: '15 Nov 2025', keyDate: '25 Jul 2026', value: 800000, recent: false },
  { ref: 'P966/4', client: 'Callum Pargeter', salutation: 'Mrs Pargeter', description: 'Will and LPA — Mrs Pargeter', area: 'Wills & Trusts / Drafting', previousArea: 'Litigation / General', feeEarner: 'Aisha Malik', office: 'Winchester', address: '45 Wharf Road, Winchester', postcode: 'SO23 2ET', status: 'Open', phone: '07700 904173', email: 'c.pargeter@example.com', openedOn: '10 Jan 2026', keyDate: '28 Sep 2026', value: 75000, recent: false },
  { ref: 'Q386/4', client: 'Verity Quennell', salutation: 'Mrs Quennell', description: 'Contested estate — Quennell', area: 'Probate / Contentious', previousArea: 'Litigation / General', feeEarner: 'Fiasal Aslam', office: 'Brighton', address: '175 Rectory Lane, Brighton', postcode: 'BN1 1AA', status: 'Open', phone: '07700 902818', email: 'v.quennell@example.com', openedOn: '09 Feb 2025', keyDate: '06 Apr 2027', value: 680000, recent: false },
  { ref: 'D771/4', client: 'Alan Drinkwater', salutation: 'Miss Drinkwater', description: 'Estate of Miss Drinkwater', area: 'Probate / Estates', previousArea: 'Corporate / Advice', feeEarner: 'Priya Raman', office: 'Guildford', address: '85 Vicarage Close, Guildford', postcode: 'GU1 2TW', status: 'Open', phone: '07700 955299', email: 'a.drinkwater@example.com', openedOn: '23 Sep 2026', keyDate: '15 Dec 2026', value: 715000, recent: false },
  { ref: 'A46/4', client: 'Ashgrove Ltd', salutation: 'Ashgrove Ltd', description: 'Acquisition of Ashgrove Ltd', area: 'Corporate / M&A', previousArea: null, feeEarner: 'Sarah Gillingham', office: 'Brighton', address: '13 Wharf Road, Brighton', postcode: 'BN1 3XR', status: 'Reopening', phone: '01483 998357', email: 'office@ashgrove.example', openedOn: '01 Dec 2026', keyDate: '26 Aug 2027', value: 670000, recent: false },
  { ref: 'R998/4', client: 'Colin Rathbone', salutation: 'Miss Rathbone', description: 'Collective enfranchisement — Kingsmead House', area: 'Landlord & Tenant / Enfranchisement', previousArea: null, feeEarner: 'Aisha Malik', office: 'Woking', address: '112 Orchard Crescent, Woking', postcode: 'GU21 4LX', status: 'Open', phone: '07700 993563', email: 'c.rathbone@example.com', openedOn: '14 Apr 2026', keyDate: '15 Apr 2026', value: 1165000, recent: false },
  { ref: 'P487/2', client: 'Jasmine Prendergast', salutation: 'Miss Prendergast', description: 'Dispute with Prendergast', area: 'Litigation / General', previousArea: null, feeEarner: 'Elena Kovac', office: 'London', address: '119 Vicarage Close, London', postcode: 'SW17 9NJ', status: 'Open', phone: '07700 929648', email: 'j.prendergast@example.com', openedOn: '23 Jun 2026', keyDate: '20 May 2026', value: 870000, recent: false },
  { ref: 'B677/4', client: 'Ewan Blackwood', salutation: 'Ms Blackwood', description: 'Financial remedy — Blackwood', area: 'Family / Divorce', previousArea: null, feeEarner: 'Natalie Thorne', office: 'Reading', address: '95 Granary Court, Reading', postcode: 'RG1 3ER', status: 'Closing', phone: '07700 998946', email: 'e.blackwood@example.com', openedOn: '11 Feb 2025', keyDate: '06 Jul 2026', value: 1090000, recent: false },
  { ref: 'D585/4', client: 'Nicola Dalgleish', salutation: 'Miss Dalgleish', description: 'Lease renewal — 86 Orchard Crescent', area: 'Landlord & Tenant / Commercial', previousArea: null, feeEarner: 'Aisha Malik', office: 'Farnham', address: '86 Orchard Crescent, Farnham', postcode: 'GU9 8NH', status: 'Open', phone: '07700 938440', email: 'n.dalgleish@example.com', openedOn: '12 Apr 2025', keyDate: '10 Jan 2026', value: 500000, recent: false },
  { ref: 'F180/3', client: 'Fernbank Ltd', salutation: 'Fernbank Ltd', description: 'Contract review — Fernbank Ltd', area: 'Employment / Advisory', previousArea: 'Property / Residential', feeEarner: 'Elena Kovac', office: 'Reading', address: '126 Quarry Hill, Reading', postcode: 'RG1 1XE', status: 'Reopening', phone: '01483 906292', email: 'legal@fernbank.example', openedOn: '19 Dec 2025', keyDate: '24 Aug 2026', value: 105000, recent: false },
  { ref: 'H488/3', client: 'Malcolm Holbrook', salutation: 'Dr Holbrook', description: 'CGT advice — Holbrook', area: 'Private Client / Tax', previousArea: null, feeEarner: 'Marcus Ellery', office: 'Reading', address: '23 Vicarage Close, Reading', postcode: 'RG1 9YP', status: 'Open', phone: '07700 933742', email: 'm.holbrook@example.com', openedOn: '07 Jun 2026', keyDate: '24 Jul 2027', value: 1075000, recent: false },
  { ref: 'B341/4', client: 'Brackenhill Ltd', salutation: 'Brackenhill Ltd', description: 'Contract review — Brackenhill Ltd', area: 'Employment / Advisory', previousArea: 'Property / Residential', feeEarner: 'Marcus Ellery', office: 'Farnham', address: '144 Dovecote Way, Farnham', postcode: 'GU9 3NW', status: 'Open', phone: '01483 993573', email: 'accounts@brackenhill.example', openedOn: '04 Aug 2025', keyDate: '28 Oct 2026', value: 500000, recent: false },
  { ref: 'C868/1', client: 'Paula Copeland', salutation: 'Mr Copeland', description: 'Collective enfranchisement — Quarrywood House', area: 'Landlord & Tenant / Enfranchisement', previousArea: 'Landlord & Tenant / Enfranchisement', feeEarner: 'Tessie Bennett', office: 'London', address: '10 Mill Green, London', postcode: 'SW17 5AZ', status: 'Open', phone: '07700 990167', email: 'p.copeland@example.com', openedOn: '11 Apr 2026', keyDate: '20 Feb 2027', value: 1080000, recent: false },
  { ref: 'N121/3', client: 'Beth Nuttall', salutation: 'Mrs Nuttall', description: 'Refinance of Ravenscourt Estate', area: 'Property / Commercial', previousArea: null, feeEarner: 'Aisha Malik', office: 'Farnham', address: '175 Lynton Road, Farnham', postcode: 'GU9 3NT', status: 'Open', phone: '07700 967181', email: 'b.nuttall@example.com', openedOn: '16 Apr 2025', keyDate: '26 May 2027', value: 585000, recent: false },
  { ref: 'B53/2', client: 'Brackenhill Ltd', salutation: 'Brackenhill Ltd', description: 'Shareholders agreement — Brackenhill Ltd', area: 'Corporate / Advice', previousArea: null, feeEarner: 'Sarah Gillingham', office: 'Brighton', address: '150 Hazelwood Drive, Brighton', postcode: 'BN1 5NN', status: 'Closing', phone: '01483 937806', email: 'accounts@brackenhill.example', openedOn: '03 Apr 2025', keyDate: '15 Mar 2027', value: 975000, recent: false },
  { ref: 'P305/1', client: 'Pemberley Ltd', salutation: 'Pemberley Ltd', description: 'Redundancy programme — Pemberley Ltd', area: 'Employment / Advisory', previousArea: null, feeEarner: 'Fiasal Aslam', office: 'Winchester', address: '176 Tanners Row, Winchester', postcode: 'SO23 8XD', status: 'Open', phone: '01483 939930', email: 'accounts@pemberley.example', openedOn: '24 Jan 2025', keyDate: '19 Dec 2026', value: 305000, recent: false },
  { ref: 'T880/4', client: 'Petra Thackeray', salutation: 'Dr Thackeray', description: 'Collective enfranchisement — Cavendish House', area: 'Landlord & Tenant / Enfranchisement', previousArea: 'Landlord & Tenant / Enfranchisement', feeEarner: 'Tom Okafor', office: 'Brighton', address: '119 Lynton Road, Brighton', postcode: 'BN1 7EB', status: 'Open', phone: '07700 976915', email: 'p.thackeray@example.com', openedOn: '28 Nov 2025', keyDate: null, value: 865000, recent: false },
  { ref: 'C158/1', client: 'Zoe Copeland', salutation: 'Mrs Copeland', description: 'IHT planning — Mrs Copeland', area: 'Private Client / Tax', previousArea: 'Property / Residential', feeEarner: 'Greg Barrett', office: 'Woking', address: '6 Mill Green, Woking', postcode: 'GU21 5XY', status: 'Open', phone: '07700 974622', email: 'z.copeland@example.com', openedOn: '22 Sep 2025', keyDate: '13 Apr 2026', value: 495000, recent: false },
  { ref: 'J472/4', client: 'Jesmond Ltd', salutation: 'Jesmond Ltd', description: 'Shareholders agreement — Jesmond Ltd', area: 'Corporate / Advice', previousArea: 'Property / Residential', feeEarner: 'Fiasal Aslam', office: 'Farnham', address: '64 Yew Tree Lane, Farnham', postcode: 'GU9 5SB', status: 'Open', phone: '01483 938297', email: 'legal@jesmond.example', openedOn: '18 Jul 2026', keyDate: '08 Oct 2026', value: 1010000, recent: false },
  { ref: 'F93/4', client: 'Fernbank Ltd', salutation: 'Fernbank Ltd', description: 'Asset finance — Fernbank Plant Ltd', area: 'Commercial / Banking and Asset Finance', previousArea: null, feeEarner: 'Elena Kovac', office: 'Reading', address: '102 Saxon Way, Reading', postcode: 'RG1 8YD', status: 'Open', phone: '01483 990378', email: 'office@fernbank.example', openedOn: '13 Jul 2025', keyDate: '16 Dec 2026', value: 1075000, recent: false },
  { ref: 'H814/3', client: 'Ewan Holbrook', salutation: 'Mr Holbrook', description: 'Dilapidations claim — 156 Kiln Lane', area: 'Litigation / Property', previousArea: null, feeEarner: 'Aisha Malik', office: 'Woking', address: '156 Kiln Lane, Woking', postcode: 'GU21 2LU', status: 'Open', phone: '07700 936940', email: 'e.holbrook@example.com', openedOn: '13 Jul 2026', keyDate: '02 Nov 2027', value: 545000, recent: false },
  { ref: 'F458/1', client: 'Fernbank Ltd', salutation: 'Fernbank Ltd', description: 'Asset finance — Fernbank Plant Ltd', area: 'Commercial / Banking and Asset Finance', previousArea: 'Corporate / Advice', feeEarner: 'Marcus Ellery', office: 'Winchester', address: '139 Granary Court, Winchester', postcode: 'SO23 4RJ', status: 'Reopening', phone: '01483 941273', email: 'legal@fernbank.example', openedOn: '15 Oct 2025', keyDate: null, value: 410000, recent: false },
  { ref: 'H316/4', client: 'Umar Hathaway', salutation: 'Mrs Hathaway', description: 'Contested estate — Hathaway', area: 'Probate / Contentious', previousArea: 'Property / Residential', feeEarner: 'Natalie Thorne', office: 'London', address: '32 Mill Green, London', postcode: 'SW17 3ED', status: 'Closing', phone: '07700 920760', email: 'u.hathaway@example.com', openedOn: '25 Jun 2025', keyDate: '09 Apr 2026', value: 255000, recent: false },
  { ref: 'F61/1', client: 'Paula Fenwick', salutation: 'Miss Fenwick', description: 'Administration of Fenwick estate', area: 'Probate / Estates', previousArea: null, feeEarner: 'Sarah Gillingham', office: 'Winchester', address: '106 Ivy Terrace, Winchester', postcode: 'SO23 2AN', status: 'Open', phone: '07700 968945', email: 'p.fenwick@example.com', openedOn: '06 Apr 2025', keyDate: '08 Apr 2027', value: 905000, recent: false },
  { ref: 'G914/4', client: 'Glenmore Holdings Ltd', salutation: 'Glenmore Holdings Ltd', description: 'Share sale — Glenmore Holdings', area: 'Corporate / M&A', previousArea: null, feeEarner: 'Elena Kovac', office: 'Woking', address: '28 Union Street, Woking', postcode: 'GU21 1XJ', status: 'Open', phone: '01483 964629', email: 'office@glenmore.example', openedOn: '14 Dec 2026', keyDate: '13 Dec 2026', value: 1190000, recent: false },
  { ref: 'L373/2', client: 'Larchfield Ltd', salutation: 'Larchfield Ltd', description: 'Claim against Larchfield Ltd', area: 'Litigation / General', previousArea: null, feeEarner: 'Marcus Ellery', office: 'Brighton', address: '50 Orchard Crescent, Brighton', postcode: 'BN1 5AH', status: 'Open', phone: '01483 943305', email: 'office@larchfield.example', openedOn: '12 Aug 2025', keyDate: null, value: 1050000, recent: false },
  { ref: 'L608/4', client: 'Rhys Langridge', salutation: 'Mr Langridge', description: 'Will and LPA — Mr Langridge', area: 'Wills & Trusts / Drafting', previousArea: 'Property / Residential', feeEarner: 'Elena Kovac', office: 'Guildford', address: '63 Granary Court, Guildford', postcode: 'GU1 9LW', status: 'Open', phone: '07700 983222', email: 'r.langridge@example.com', openedOn: '22 Jul 2025', keyDate: '02 Dec 2027', value: 840000, recent: false },
  { ref: 'V411/3', client: 'Vale End Ltd', salutation: 'Vale End Ltd', description: 'Asset finance — Vale End Plant Ltd', area: 'Commercial / Banking and Asset Finance', previousArea: null, feeEarner: 'Paul Reynolds', office: 'Reading', address: '118 Abbey Road, Reading', postcode: 'RG1 9JP', status: 'Open', phone: '01483 900731', email: 'office@valeend.example', openedOn: '20 Aug 2026', keyDate: '21 Nov 2026', value: 605000, recent: false },
  { ref: 'L21/2', client: 'Larchfield Ltd', salutation: 'Larchfield Ltd', description: 'Skilled worker sponsorship — Larchfield Ltd', area: 'Immigration / Business', previousArea: null, feeEarner: 'Dan Whitfield', office: 'Guildford', address: '54 Saxon Way, Guildford', postcode: 'GU1 2PU', status: 'Open', phone: '01483 990380', email: 'legal@larchfield.example', openedOn: '08 Mar 2026', keyDate: null, value: 1145000, recent: false },
  { ref: 'R103/3', client: 'Martin Rathbone', salutation: 'Mr Rathbone', description: 'Child arrangements — Rathbone', area: 'Family / Children', previousArea: 'Landlord & Tenant / Enfranchisement', feeEarner: 'Elena Kovac', office: 'Guildford', address: '27 Orchard Crescent, Guildford', postcode: 'GU1 2RR', status: 'Open', phone: '07700 951557', email: 'm.rathbone@example.com', openedOn: '16 Mar 2025', keyDate: '14 Nov 2026', value: 1050000, recent: false },
  { ref: 'V618/1', client: 'Wesley Vansittart', salutation: 'Dr Vansittart', description: 'Section 21 notice — 20 Saxon Way', area: 'Landlord & Tenant / Residential', previousArea: 'Litigation / General', feeEarner: 'Natalie Thorne', office: 'Woking', address: '20 Saxon Way, Woking', postcode: 'GU21 4ZA', status: 'Open', phone: '07700 936801', email: 'w.vansittart@example.com', openedOn: '14 Dec 2026', keyDate: '25 Apr 2027', value: 875000, recent: false },
  { ref: 'V781/1', client: 'Vale End Ltd', salutation: 'Vale End Ltd', description: 'Shareholders agreement — Vale End Ltd', area: 'Corporate / Advice', previousArea: 'Litigation / General', feeEarner: 'Natalie Thorne', office: 'Winchester', address: '160 Newlands Avenue, Winchester', postcode: 'SO23 8ZE', status: 'Closing', phone: '01483 967411', email: 'accounts@valeend.example', openedOn: '21 Nov 2025', keyDate: null, value: 1000000, recent: false },
  { ref: 'P230/4', client: 'Pemberley Ltd', salutation: 'Pemberley Ltd', description: 'Contract review — Pemberley Ltd', area: 'Employment / Advisory', previousArea: 'Property / Residential', feeEarner: 'Tessie Bennett', office: 'Woking', address: '144 Lynton Road, Woking', postcode: 'GU21 9NU', status: 'Open', phone: '01483 957779', email: 'office@pemberley.example', openedOn: '27 Jul 2025', keyDate: null, value: 305000, recent: false },
  { ref: 'H491/3', client: 'Paula Hathaway', salutation: 'Dr Hathaway', description: 'Will and LPA — Dr Hathaway', area: 'Wills & Trusts / Drafting', previousArea: 'Advocacy / General', feeEarner: 'Crispin Dale', office: 'Farnham', address: '56 Chapel Street, Farnham', postcode: 'GU9 3JY', status: 'Open', phone: '07700 919434', email: 'p.hathaway@example.com', openedOn: '12 Nov 2025', keyDate: '06 Aug 2027', value: 1125000, recent: false },
  { ref: 'O957/3', client: 'Graham Ormerod', salutation: 'Mr Ormerod', description: 'IHT planning — Mr Ormerod', area: 'Private Client / Tax', previousArea: 'Landlord & Tenant / Enfranchisement', feeEarner: 'Natalie Thorne', office: 'Brighton', address: '38 Lynton Road, Brighton', postcode: 'BN1 4SH', status: 'Open', phone: '07700 960878', email: 'g.ormerod@example.com', openedOn: '09 Dec 2025', keyDate: '08 Mar 2027', value: 590000, recent: false },
  { ref: 'M204/1', client: 'Jasmine Mainwaring', salutation: 'Mrs Mainwaring', description: 'Dispute with Mainwaring', area: 'Litigation / General', previousArea: null, feeEarner: 'Fiasal Aslam', office: 'Guildford', address: '123 Juniper Rise, Guildford', postcode: 'GU1 2HW', status: 'Open', phone: '07700 994994', email: 'j.mainwaring@example.com', openedOn: '17 Aug 2026', keyDate: '14 Jul 2026', value: 450000, recent: false },
  { ref: 'M835/3', client: 'Mereside Holdings Ltd', salutation: 'Mereside Holdings Ltd', description: 'Share sale — Mereside Holdings', area: 'Corporate / M&A', previousArea: null, feeEarner: 'Priya Raman', office: 'Winchester', address: '10 Fairmile Avenue, Winchester', postcode: 'SO23 2NS', status: 'Reopening', phone: '01483 969083', email: 'office@mereside.example', openedOn: '12 Aug 2026', keyDate: '26 Nov 2026', value: 345000, recent: false },
  { ref: 'K419/4', client: 'Kestrel Ltd', salutation: 'Kestrel Ltd', description: 'Facility agreement — Kestrel Ltd', area: 'Commercial / Banking and Asset Finance', previousArea: null, feeEarner: 'Guy Setford', office: 'Woking', address: '148 Hazelwood Drive, Woking', postcode: 'GU21 5BR', status: 'Open', phone: '01483 954014', email: 'legal@kestrel.example', openedOn: '16 Nov 2025', keyDate: '22 Sep 2027', value: 1170000, recent: false },
  { ref: 'I34/1', client: 'Fiona Ivatt', salutation: 'Dr Ivatt', description: 'Lease renewal — 174 Eaton Close', area: 'Landlord & Tenant / Commercial', previousArea: 'Property / Residential', feeEarner: 'Elena Kovac', office: 'Guildford', address: '174 Eaton Close, Guildford', postcode: 'GU1 8XW', status: 'Open', phone: '07700 938187', email: 'f.ivatt@example.com', openedOn: '05 May 2025', keyDate: '24 Nov 2027', value: 590000, recent: false },
  { ref: 'K393/3', client: 'Quentin Kenworthy', salutation: 'Miss Kenworthy', description: 'Inheritance Act claim — Kenworthy', area: 'Probate / Contentious', previousArea: 'Litigation / General', feeEarner: 'Crispin Dale', office: 'Reading', address: '103 Priory Walk, Reading', postcode: 'RG1 4NJ', status: 'Open', phone: '07700 958952', email: 'q.kenworthy@example.com', openedOn: '03 Jun 2025', keyDate: '10 Feb 2027', value: 255000, recent: false },
  { ref: 'L93/2', client: 'Tanya Lonsdale', salutation: 'Mrs Lonsdale', description: 'Child arrangements — Lonsdale', area: 'Family / Children', previousArea: null, feeEarner: 'Fiasal Aslam', office: 'London', address: '12 Chapel Street, London', postcode: 'SW17 3HW', status: 'Open', phone: '07700 955203', email: 't.lonsdale@example.com', openedOn: '16 Sep 2025', keyDate: '23 Feb 2027', value: 125000, recent: false },
  { ref: 'E893/2', client: 'Laura Ellingham', salutation: 'Mrs Ellingham', description: 'Collective enfranchisement — Glenmore House', area: 'Landlord & Tenant / Enfranchisement', previousArea: 'Landlord & Tenant / Enfranchisement', feeEarner: 'Paul Reynolds', office: 'London', address: '78 Ivy Terrace, London', postcode: 'SW17 5JT', status: 'Open', phone: '07700 957185', email: 'l.ellingham@example.com', openedOn: '10 Apr 2025', keyDate: null, value: 1075000, recent: false },
  { ref: 'I859/1', client: 'Ivybridge Holdings Ltd', salutation: 'Ivybridge Holdings Ltd', description: 'Share sale — Ivybridge Holdings', area: 'Corporate / M&A', previousArea: null, feeEarner: 'Marcus Ellery', office: 'Guildford', address: '120 Juniper Rise, Guildford', postcode: 'GU1 7TD', status: 'Open', phone: '01483 990329', email: 'office@ivybridge.example', openedOn: '18 Jul 2026', keyDate: '20 Nov 2027', value: 85000, recent: false },
  { ref: 'A845/4', client: 'Leonie Ainsworth', salutation: 'Ms Ainsworth', description: 'Administration of Ainsworth estate', area: 'Probate / Estates', previousArea: null, feeEarner: 'Tessie Bennett', office: 'Reading', address: '62 Mill Green, Reading', postcode: 'RG1 4BW', status: 'Open', phone: '07700 952675', email: 'l.ainsworth@example.com', openedOn: '15 Apr 2026', keyDate: '19 Jan 2026', value: 455000, recent: false },
  { ref: 'K834/1', client: 'Paula Kenworthy', salutation: 'Dr Kenworthy', description: 'Divorce and consent order — Kenworthy', area: 'Family / Divorce', previousArea: 'Property / Residential', feeEarner: 'Greg Barrett', office: 'Winchester', address: '81 Dovecote Way, Winchester', postcode: 'SO23 8ZT', status: 'Closing', phone: '07700 973887', email: 'p.kenworthy@example.com', openedOn: '17 Sep 2026', keyDate: '23 Sep 2027', value: 200000, recent: false },
  { ref: 'C222/3', client: 'Eamon Copeland', salutation: 'Dr Copeland', description: 'Tribunal claim — Copeland', area: 'Litigation / Employment', previousArea: 'Litigation / General', feeEarner: 'Aisha Malik', office: 'Farnham', address: '141 Saxon Way, Farnham', postcode: 'GU9 5ZR', status: 'Open', phone: '07700 978884', email: 'e.copeland@example.com', openedOn: '11 Mar 2026', keyDate: '28 Oct 2027', value: 975000, recent: false },
  { ref: 'A939/4', client: 'Helen Ashcroft', salutation: 'Ms Ashcroft', description: 'Administration of Ashcroft estate', area: 'Probate / Estates', previousArea: null, feeEarner: 'Elena Kovac', office: 'Brighton', address: '15 Bramble Lane, Brighton', postcode: 'BN1 6TX', status: 'Closing', phone: '07700 902730', email: 'h.ashcroft@example.com', openedOn: '01 Jan 2026', keyDate: '06 Nov 2027', value: 525000, recent: false },
  { ref: 'A82/4', client: 'Ashgrove Ltd', salutation: 'Ashgrove Ltd', description: 'Redundancy programme — Ashgrove Ltd', area: 'Employment / Advisory', previousArea: 'Litigation / General', feeEarner: 'Tessie Bennett', office: 'Reading', address: '98 Hazelwood Drive, Reading', postcode: 'RG1 1LD', status: 'Open', phone: '01483 996442', email: 'accounts@ashgrove.example', openedOn: '02 Dec 2026', keyDate: '12 Dec 2027', value: 495000, recent: false },
  { ref: 'Q765/3', client: 'Victor Quennell', salutation: 'Ms Quennell', description: 'Purchase of Pemberley House', area: 'Property / Commercial', previousArea: 'Advocacy / General', feeEarner: 'Sarah Gillingham', office: 'Brighton', address: '159 Chapel Street, Brighton', postcode: 'BN1 9AX', status: 'Open', phone: '07700 936141', email: 'v.quennell@example.com', openedOn: '16 Aug 2026', keyDate: null, value: 350000, recent: false },
  { ref: 'B980/4', client: 'Brackenhill Ltd', salutation: 'Brackenhill Ltd', description: 'Facility agreement — Brackenhill Ltd', area: 'Commercial / Banking and Asset Finance', previousArea: 'Advocacy / General', feeEarner: 'Tessie Bennett', office: 'Guildford', address: '138 Ivy Terrace, Guildford', postcode: 'GU1 5YT', status: 'Closing', phone: '01483 925437', email: 'accounts@brackenhill.example', openedOn: '19 May 2026', keyDate: '09 Dec 2027', value: 1195000, recent: false },
  { ref: 'O382/2', client: 'Zoe Oglethorpe', salutation: 'Ms Oglethorpe', description: 'Divorce and consent order — Oglethorpe', area: 'Family / Divorce', previousArea: 'Landlord & Tenant / Enfranchisement', feeEarner: 'Marcus Ellery', office: 'Winchester', address: '103 Abbey Road, Winchester', postcode: 'SO23 3JD', status: 'Open', phone: '07700 988705', email: 'z.oglethorpe@example.com', openedOn: '25 Dec 2025', keyDate: '22 Nov 2026', value: 80000, recent: false },
  { ref: 'S889/2', client: 'Stanmore Ltd', salutation: 'Stanmore Ltd', description: 'Skilled worker sponsorship — Stanmore Ltd', area: 'Immigration / Business', previousArea: null, feeEarner: 'Dan Whitfield', office: 'Reading', address: '81 Chapel Street, Reading', postcode: 'RG1 7PR', status: 'Open', phone: '01483 923690', email: 'accounts@stanmore.example', openedOn: '21 Jul 2025', keyDate: '16 Jul 2026', value: 945000, recent: false },
  { ref: 'M315/4', client: 'Mereside Ltd', salutation: 'Mereside Ltd', description: 'Acquisition of Mereside Ltd', area: 'Corporate / M&A', previousArea: 'Property / Residential', feeEarner: 'Guy Setford', office: 'Reading', address: '63 Orchard Crescent, Reading', postcode: 'RG1 6RL', status: 'Open', phone: '01483 994823', email: 'office@mereside.example', openedOn: '01 Nov 2026', keyDate: '16 May 2026', value: 490000, recent: false },
  { ref: 'F898/3', client: 'Wesley Fairbairn', salutation: 'Mrs Fairbairn', description: 'Boundary dispute — 27 Granary Court', area: 'Litigation / Property', previousArea: 'Advocacy / General', feeEarner: 'Crispin Dale', office: 'Winchester', address: '27 Granary Court, Winchester', postcode: 'SO23 7YT', status: 'Open', phone: '07700 977687', email: 'w.fairbairn@example.com', openedOn: '07 Dec 2026', keyDate: '05 Feb 2027', value: 225000, recent: false },
  { ref: 'O160/3', client: 'Callum Oglethorpe', salutation: 'Mrs Oglethorpe', description: 'Estate of Mrs Oglethorpe', area: 'Probate / Estates', previousArea: null, feeEarner: 'Priya Raman', office: 'Woking', address: '10 Rectory Lane, Woking', postcode: 'GU21 7UJ', status: 'Open', phone: '07700 967291', email: 'c.oglethorpe@example.com', openedOn: '06 Jun 2026', keyDate: '21 Oct 2027', value: 650000, recent: false },
  { ref: 'P152/3', client: 'Beth Prendergast', salutation: 'Dr Prendergast', description: 'Estate of Dr Prendergast', area: 'Probate / Estates', previousArea: null, feeEarner: 'Greg Barrett', office: 'Brighton', address: '62 Abbey Road, Brighton', postcode: 'BN1 1PU', status: 'Open', phone: '07700 950812', email: 'b.prendergast@example.com', openedOn: '05 Jun 2025', keyDate: '06 Jun 2027', value: 350000, recent: false },
  { ref: 'J661/2', client: 'Jesmond Ltd', salutation: 'Jesmond Ltd', description: 'Skilled worker sponsorship — Jesmond Ltd', area: 'Immigration / Business', previousArea: null, feeEarner: 'Fiasal Aslam', office: 'Winchester', address: '123 Bramble Lane, Winchester', postcode: 'SO23 4AX', status: 'Reopening', phone: '01483 938187', email: 'accounts@jesmond.example', openedOn: '21 Mar 2026', keyDate: null, value: 150000, recent: false },
  { ref: 'O573/2', client: 'Quentin Oglethorpe', salutation: 'Miss Oglethorpe', description: 'Inheritance Act claim — Oglethorpe', area: 'Probate / Contentious', previousArea: 'Litigation / General', feeEarner: 'Paul Reynolds', office: 'London', address: '40 Fairmile Avenue, London', postcode: 'SW17 4UX', status: 'Closing', phone: '07700 902514', email: 'q.oglethorpe@example.com', openedOn: '12 Feb 2025', keyDate: null, value: 1115000, recent: false },
  { ref: 'D400/2', client: 'Umar Dalgleish', salutation: 'Miss Dalgleish', description: 'Rent review — Glenmore Unit', area: 'Landlord & Tenant / Commercial', previousArea: null, feeEarner: 'Natalie Thorne', office: 'Woking', address: '173 Ivy Terrace, Woking', postcode: 'GU21 7HR', status: 'Open', phone: '07700 904469', email: 'u.dalgleish@example.com', openedOn: '24 Feb 2025', keyDate: '16 Nov 2026', value: 895000, recent: false },
  { ref: 'K379/2', client: 'Martin Kirkbride', salutation: 'Miss Kirkbride', description: 'Discretionary trust — Kirkbride family', area: 'Wills & Trusts / Drafting', previousArea: 'Advocacy / General', feeEarner: 'Priya Raman', office: 'Farnham', address: '160 Bramble Lane, Farnham', postcode: 'GU9 4XJ', status: 'Open', phone: '07700 921118', email: 'm.kirkbride@example.com', openedOn: '16 Oct 2025', keyDate: '15 Jun 2026', value: 735000, recent: false },
  { ref: 'L766/3', client: 'Paula Langridge', salutation: 'Miss Langridge', description: 'Section 21 notice — 50 Wharf Road', area: 'Landlord & Tenant / Residential', previousArea: null, feeEarner: 'Sarah Gillingham', office: 'Guildford', address: '50 Wharf Road, Guildford', postcode: 'GU1 6RR', status: 'Open', phone: '07700 903514', email: 'p.langridge@example.com', openedOn: '06 Oct 2026', keyDate: '07 Jul 2027', value: 105000, recent: false },
  { ref: 'S87/3', client: 'Martin Sandiford', salutation: 'Miss Sandiford', description: 'IHT planning — Miss Sandiford', area: 'Private Client / Tax', previousArea: 'Property / Residential', feeEarner: 'Natalie Thorne', office: 'Reading', address: '60 Fairmile Avenue, Reading', postcode: 'RG1 8YD', status: 'Closing', phone: '07700 940934', email: 'm.sandiford@example.com', openedOn: '15 Jul 2026', keyDate: null, value: 730000, recent: false },
  { ref: 'O334/1', client: 'Oakhanger Ltd', salutation: 'Oakhanger Ltd', description: 'Retainer advice — Oakhanger Ltd', area: 'Corporate / Advice', previousArea: null, feeEarner: 'Tom Okafor', office: 'Woking', address: '19 Quarry Hill, Woking', postcode: 'GU21 9RZ', status: 'Closing', phone: '01483 931466', email: 'accounts@oakhanger.example', openedOn: '21 Oct 2026', keyDate: '25 May 2026', value: 845000, recent: false },
  { ref: 'M556/1', client: 'Marlow Ltd', salutation: 'Marlow Ltd', description: 'Redundancy programme — Marlow Ltd', area: 'Employment / Advisory', previousArea: 'Litigation / General', feeEarner: 'Greg Barrett', office: 'Farnham', address: '52 Hazelwood Drive, Farnham', postcode: 'GU9 3ZN', status: 'Open', phone: '01483 951608', email: 'accounts@marlow.example', openedOn: '13 Nov 2026', keyDate: null, value: 715000, recent: false },
  { ref: 'M168/4', client: 'Malcolm Mottram', salutation: 'Mrs Mottram', description: 'Discretionary trust — Mottram family', area: 'Wills & Trusts / Drafting', previousArea: 'Corporate / Advice', feeEarner: 'Tessie Bennett', office: 'London', address: '166 Union Street, London', postcode: 'SW17 8HP', status: 'Reopening', phone: '07700 919543', email: 'm.mottram@example.com', openedOn: '12 Nov 2025', keyDate: '01 Jun 2027', value: 115000, recent: false },
  { ref: 'P691/4', client: 'Yasmin Pargeter', salutation: 'Miss Pargeter', description: 'Purchase of 64 Hazelwood Drive', area: 'Property / Residential', previousArea: 'Corporate / Advice', feeEarner: 'Guy Setford', office: 'London', address: '64 Hazelwood Drive, London', postcode: 'SW17 5DD', status: 'Open', phone: '07700 983210', email: 'y.pargeter@example.com', openedOn: '11 Mar 2025', keyDate: '12 Sep 2027', value: 565000, recent: false },
  { ref: 'U551/2', client: 'Helen Underhill', salutation: 'Mr Underhill', description: 'Settlement negotiation — Underhill', area: 'Litigation / Employment', previousArea: 'Property / Residential', feeEarner: 'Crispin Dale', office: 'Brighton', address: '138 Union Street, Brighton', postcode: 'BN1 4NP', status: 'Closing', phone: '07700 985196', email: 'h.underhill@example.com', openedOn: '24 Dec 2025', keyDate: '08 Apr 2027', value: 1165000, recent: false },
  { ref: 'I82/2', client: 'Ivybridge Ltd', salutation: 'Ivybridge Ltd', description: 'Debt recovery — Ivybridge Ltd', area: 'Litigation / General', previousArea: 'Litigation / General', feeEarner: 'Natalie Thorne', office: 'Guildford', address: '49 Rectory Lane, Guildford', postcode: 'GU1 6DU', status: 'Reopening', phone: '01483 924473', email: 'office@ivybridge.example', openedOn: '13 Sep 2025', keyDate: '28 Aug 2026', value: 715000, recent: false },
  { ref: 'Q141/3', client: 'Quarrywood Ltd', salutation: 'Quarrywood Ltd', description: 'Redundancy programme — Quarrywood Ltd', area: 'Employment / Advisory', previousArea: 'Advocacy / General', feeEarner: 'Paul Reynolds', office: 'Winchester', address: '57 Rectory Lane, Winchester', postcode: 'SO23 1ZP', status: 'Closing', phone: '01483 988745', email: 'legal@quarrywood.example', openedOn: '06 Jan 2026', keyDate: '09 Sep 2026', value: 250000, recent: false },
  { ref: 'P90/1', client: 'Ewan Pargeter', salutation: 'Ms Pargeter', description: 'Contested estate — Pargeter', area: 'Probate / Contentious', previousArea: 'Landlord & Tenant / Enfranchisement', feeEarner: 'Dan Whitfield', office: 'London', address: '155 Bramble Lane, London', postcode: 'SW17 2XA', status: 'Closing', phone: '07700 946982', email: 'e.pargeter@example.com', openedOn: '16 Aug 2026', keyDate: '21 Jan 2027', value: 270000, recent: false },
  { ref: 'I447/2', client: 'Isaac Ivatt', salutation: 'Dr Ivatt', description: 'Divorce and consent order — Ivatt', area: 'Family / Divorce', previousArea: 'Corporate / Advice', feeEarner: 'Sarah Gillingham', office: 'London', address: '12 Priory Walk, London', postcode: 'SW17 3HU', status: 'Open', phone: '07700 994577', email: 'i.ivatt@example.com', openedOn: '26 Aug 2025', keyDate: '28 Apr 2026', value: 595000, recent: false },
  { ref: 'W16/3', client: 'Callum Wetherby', salutation: 'Miss Wetherby', description: 'Administration of Wetherby estate', area: 'Probate / Estates', previousArea: 'Litigation / General', feeEarner: 'Paul Reynolds', office: 'London', address: '120 Newlands Avenue, London', postcode: 'SW17 4BB', status: 'Reopening', phone: '07700 984573', email: 'c.wetherby@example.com', openedOn: '07 Jul 2025', keyDate: null, value: 460000, recent: false },
  { ref: 'H959/2', client: 'Deborah Hathaway', salutation: 'Miss Hathaway', description: 'Discretionary trust — Hathaway family', area: 'Wills & Trusts / Drafting', previousArea: 'Litigation / General', feeEarner: 'Guy Setford', office: 'Woking', address: '40 Hazelwood Drive, Woking', postcode: 'GU21 6RE', status: 'Open', phone: '07700 969887', email: 'd.hathaway@example.com', openedOn: '23 Feb 2025', keyDate: '28 Sep 2026', value: 905000, recent: false },
  { ref: 'J570/1', client: 'Callum Jephcott', salutation: 'Miss Jephcott', description: 'Purchase of Fernbank House', area: 'Property / Commercial', previousArea: 'Corporate / Advice', feeEarner: 'Crispin Dale', office: 'Guildford', address: '17 Juniper Rise, Guildford', postcode: 'GU1 1UP', status: 'Open', phone: '07700 904501', email: 'c.jephcott@example.com', openedOn: '23 Feb 2025', keyDate: '15 Feb 2027', value: 230000, recent: false },
  { ref: 'Q754/2', client: 'Quarrywood Ltd', salutation: 'Quarrywood Ltd', description: 'Acquisition of Quarrywood Ltd', area: 'Corporate / M&A', previousArea: null, feeEarner: 'Tom Okafor', office: 'Guildford', address: '129 Lynton Road, Guildford', postcode: 'GU1 9PU', status: 'Open', phone: '01483 984495', email: 'accounts@quarrywood.example', openedOn: '22 Oct 2026', keyDate: '01 Apr 2027', value: 445000, recent: false },
  { ref: 'W926/4', client: 'Jasmine Wetherby', salutation: 'Mrs Wetherby', description: 'Rent review — Uppingham Unit', area: 'Landlord & Tenant / Commercial', previousArea: null, feeEarner: 'Dan Whitfield', office: 'London', address: '89 Kiln Lane, London', postcode: 'SW17 4XL', status: 'Open', phone: '07700 983869', email: 'j.wetherby@example.com', openedOn: '18 Mar 2025', keyDate: '17 Apr 2027', value: 1190000, recent: false },
  { ref: 'V719/3', client: 'Graham Vansittart', salutation: 'Miss Vansittart', description: 'Dilapidations claim — 56 Kiln Lane', area: 'Litigation / Property', previousArea: null, feeEarner: 'Paul Reynolds', office: 'Brighton', address: '56 Kiln Lane, Brighton', postcode: 'BN1 6AB', status: 'Open', phone: '07700 962135', email: 'g.vansittart@example.com', openedOn: '07 Mar 2026', keyDate: '02 Oct 2026', value: 280000, recent: false },
  { ref: 'K429/4', client: 'Graham Kirkbride', salutation: 'Miss Kirkbride', description: 'Financial remedy — Kirkbride', area: 'Family / Divorce', previousArea: 'Landlord & Tenant / Enfranchisement', feeEarner: 'Tom Okafor', office: 'Guildford', address: '58 Bramble Lane, Guildford', postcode: 'GU1 9SU', status: 'Open', phone: '07700 978094', email: 'g.kirkbride@example.com', openedOn: '28 Jun 2025', keyDate: '28 Sep 2026', value: 1115000, recent: false },
  { ref: 'N91/1', client: 'Northgate Ltd', salutation: 'Northgate Ltd', description: 'Claim against Northgate Ltd', area: 'Litigation / General', previousArea: 'Corporate / Advice', feeEarner: 'Tessie Bennett', office: 'Winchester', address: '167 Lynton Road, Winchester', postcode: 'SO23 4UB', status: 'Open', phone: '01483 971244', email: 'office@northgate.example', openedOn: '04 Dec 2026', keyDate: '19 Sep 2026', value: 915000, recent: false },
  { ref: 'N832/3', client: 'Northgate Ltd', salutation: 'Northgate Ltd', description: 'Acquisition of Northgate Ltd', area: 'Corporate / M&A', previousArea: 'Advocacy / General', feeEarner: 'Crispin Dale', office: 'Woking', address: '121 Rectory Lane, Woking', postcode: 'GU21 1HN', status: 'Open', phone: '01483 990761', email: 'office@northgate.example', openedOn: '05 Jun 2025', keyDate: null, value: 170000, recent: false },
  { ref: 'K654/1', client: 'Gareth Kenworthy', salutation: 'Ms Kenworthy', description: 'Section 21 notice — 28 Wharf Road', area: 'Landlord & Tenant / Residential', previousArea: 'Advocacy / General', feeEarner: 'Guy Setford', office: 'Winchester', address: '28 Wharf Road, Winchester', postcode: 'SO23 5XP', status: 'Open', phone: '07700 984634', email: 'g.kenworthy@example.com', openedOn: '09 Nov 2025', keyDate: '09 Jul 2027', value: 50000, recent: false },
  { ref: 'O869/3', client: 'Oakhanger Ltd', salutation: 'Oakhanger Ltd', description: 'Acquisition of Oakhanger Ltd', area: 'Corporate / M&A', previousArea: 'Corporate / Advice', feeEarner: 'Crispin Dale', office: 'London', address: '73 Ivy Terrace, London', postcode: 'SW17 6DB', status: 'Open', phone: '01483 918480', email: 'accounts@oakhanger.example', openedOn: '03 Sep 2026', keyDate: '26 Nov 2027', value: 685000, recent: false },
]);

// ------------------------------------------------------------
//  Task pool the AI draws on. Ticket 33593 — the workload engine
//  picks from this and packs it into the time the user asked for.
//
//  lane          finance | operations | communications
//  section       the grouping heading + running time in the column
//  mins          how long Halo reckons the task takes
//  priority      higher wins when the budget is tight
//  kind          standard | document | message | locked  (ticket 33748)
//  requiresLanes lanes that must also be in scope for the task to be
//                offered at all — end-of-matter comms are pointless
//                while the money and admin on the file are unresolved
//  blockedBy     lanes that must be *cleared* before it can be worked;
//                until then the card renders in its locked state
// ------------------------------------------------------------
HALO.tasks = [
  // ---------------- Finance ----------------
  {
    id: 'fin-und-1', lane: 'finance', section: 'Undertakings', mins: 9, priority: 92,
    kind: 'standard', matterRef: 'B12/2',
    meta: 'UND-0781 to Hale & Co', title: 'Discharge of Nationwide charge',
    secondary: 'Review', primary: 'Discharge',
  },
  {
    id: 'fin-und-2', lane: 'finance', section: 'Undertakings', mins: 7, priority: 74,
    kind: 'standard', matterRef: 'A204/4',
    meta: 'UND-0794 to Shawbrook', title: 'Redemption statement outstanding',
    secondary: 'Review', primary: 'Discharge',
  },
  {
    id: 'fin-bal-1', lane: 'finance', section: 'Client balances', mins: 14, priority: 88,
    kind: 'standard', matterRef: 'A25/1',
    meta: 'A25/1 · Mr A Adamson', title: '£240.00 to return',
    secondary: 'Review', primary: 'Raise request',
  },
  {
    id: 'fin-wip-1', lane: 'finance', section: 'Work in progress', mins: 3, priority: 61,
    kind: 'standard', matterRef: 'P124/1',
    meta: 'P124/1 · 4 unbilled entries', title: '£515.00 unbilled',
    secondary: 'Review', primary: 'Write off',
  },
  {
    id: 'fin-wip-2', lane: 'finance', section: 'Work in progress', mins: 6, priority: 44,
    kind: 'standard', matterRef: '110/1',
    meta: '110/1 · 2 unbilled entries', title: '£180.00 unbilled',
    secondary: 'Review', primary: 'Write off',
  },
  {
    id: 'fin-dis-1', lane: 'finance', section: 'Disbursements', mins: 8, priority: 38,
    kind: 'standard', matterRef: '60002/1',
    meta: '60002/1 · 3 unpaid', title: '£96.00 in unpaid disbursements',
    secondary: 'Review', primary: 'Pay',
  },

  // ---------------- Operations ----------------
  {
    id: 'ops-task-1', lane: 'operations', section: 'Outstanding tasks', mins: 6, priority: 95,
    kind: 'standard', matterRef: 'P124/1',
    meta: 'P124/1 · 1 overdue by 5 days', title: '2 tasks still open',
    secondary: 'Review', primary: 'Remove',
  },
  {
    id: 'ops-task-2', lane: 'operations', section: 'Outstanding tasks', mins: 4, priority: 70,
    kind: 'standard', matterRef: 'A8/7',
    meta: 'A8/7 · 1 overdue by 2 days', title: '1 task still open',
    secondary: 'Review', primary: 'Remove',
  },
  {
    id: 'ops-date-1', lane: 'operations', section: 'Key dates to confirm', mins: 1, priority: 66,
    kind: 'standard', matterRef: 'A25/1',
    meta: 'A25/1 · 12 Sep 2026', title: 'One date after today',
    secondary: 'Review', primary: 'Remove',
  },
  {
    id: 'ops-aml-1', lane: 'operations', section: 'AML checks', mins: 12, priority: 55,
    kind: 'standard', matterRef: 'A1662/2',
    meta: 'A1662/2 · ID expired', title: 'Proof of address out of date',
    secondary: 'Review', primary: 'Request',
  },
  {
    id: 'ops-file-1', lane: 'operations', section: 'Files ready to close', mins: 9, priority: 34,
    kind: 'standard', matterRef: 'E07/2',
    meta: 'E07/2 · no activity for 240 days', title: 'Matter looks complete',
    secondary: 'Review', primary: 'Close',
  },

  // ---------------- Communications ----------------
  {
    id: 'com-draft-1', lane: 'communications', section: 'Draft replies to clients', mins: 3, priority: 99,
    kind: 'message', matterRef: 'A1662/2',
    from: 'Hannah Whitmore', initials: 'HW', channel: 'Email',
    meta: 'A1662/2 · 6 days ago',
    quote: '“Can you confirm the freehold has agreed the revised premium?”',
    secondary: 'Edit', primary: 'Send',
  },
  {
    id: 'com-draft-2', lane: 'communications', section: 'Draft replies to clients', mins: 2, priority: 81,
    kind: 'message', matterRef: 'A419/3',
    from: 'David Anderson', initials: 'DA', channel: 'Portal',
    meta: 'A419/3 · 3 days ago',
    quote: '“Has the freeholder come back on the consent application?”',
    secondary: 'Edit', primary: 'Send',
  },
  {
    id: 'com-close-1', lane: 'communications', section: 'Closing letter', mins: 4, priority: 86,
    kind: 'document', matterRef: 'A204/3', requiresLanes: ['finance', 'operations'],
    meta: 'A204/3 · template ready', title: 'Closing letter not sent',
    secondary: 'Preview', primary: 'Send',
  },
  {
    id: 'com-close-2', lane: 'communications', section: 'Closing letter', mins: 2, priority: 58,
    kind: 'document', matterRef: 'A204/4', requiresLanes: ['finance', 'operations'],
    meta: 'A204/4 · template ready', title: 'Closing letter not sent',
    secondary: 'Preview', primary: 'Send',
  },
  {
    id: 'com-review-1', lane: 'communications', section: 'Review request', mins: 2, priority: 48,
    kind: 'locked', matterRef: 'A204/3',
    requiresLanes: ['finance', 'operations'], blockedBy: ['finance', 'operations'],
    meta: 'A204/3 · Trustpilot', title: 'Trustpilot request',
    lockNote: 'Locked until finance and operations tasks completed',
    secondary: 'Preview', primary: 'Send',
  },
  {
    id: 'com-review-2', lane: 'communications', section: 'Review request', mins: 1, priority: 30,
    kind: 'locked', matterRef: 'A204/4',
    requiresLanes: ['finance', 'operations'], blockedBy: ['finance', 'operations'],
    meta: 'A204/4 · Trustpilot', title: 'Trustpilot request',
    lockNote: 'Locked until finance and operations tasks completed',
    secondary: 'Preview', primary: 'Send',
  },
  {
    id: 'com-chase-1', lane: 'communications', section: 'Chase the other side', mins: 7, priority: 41,
    kind: 'standard', matterRef: '60002/1', requiresLanes: ['operations'],
    meta: '60002/1 · no reply for 8 days', title: 'Enquiries sent 14 Aug unanswered',
    secondary: 'Review', primary: 'Chase',
  },
];

// The lane a task type filter maps onto, and the copy the prompt uses.
HALO.lanes = [
  { id: 'finance',        label: 'Finance',        chip: 'Finance' },
  { id: 'operations',     label: 'Operations',     chip: 'Operations' },
  { id: 'communications', label: 'Communications', chip: 'Communications' },
];

// Duration units offered by the prompt. The label singularises off the amount
// (1 -> "Hour", 2 -> "Hours"), so only the plural form is stored.
HALO.units = ['Minutes', 'Hours', 'Days', 'Months'];

// ------------------------------------------------------------
//  The rest of the caseload's work, so picking an arbitrary
//  matter has something on it.
//
//  Three deliberate constraints keep the designed screens exact:
//    * finance and operations only — so a Communications-only
//      prompt still plans just what frame 5548:487480 shows;
//    * priority below the designed set (which runs 30-99) — so
//      the designed tasks are always chosen first;
//    * never shorter than 3 minutes — a 1-hour all-lanes prompt
//      plans the designed 58 minutes and has 2 left, which
//      nothing here can fit into.
//  Ask for more time, or narrow to a matter, and these surface.
// ------------------------------------------------------------
HALO.tasks = HALO.tasks.concat([
  { id: 'x-d2131-0', lane: 'operations', section: 'Outstanding tasks', mins: 18, priority: 22, kind: 'standard', matterRef: 'D213/1', meta: 'D213/1 · 1 overdue by 20 days', title: '1 task still open', secondary: 'Review', primary: 'Remove' },
  { id: 'x-e072-1', lane: 'operations', section: 'Files ready to close', mins: 10, priority: 2, kind: 'standard', matterRef: 'E07/2', meta: 'E07/2 · no activity for 341 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-d5854-2', lane: 'finance', section: 'Undertakings', mins: 10, priority: 5, kind: 'standard', matterRef: 'D585/4', meta: 'UND-2839 to NatWest', title: 'Undertaking still open', secondary: 'Review', primary: 'Discharge' },
  { id: 'x-d5854-3', lane: 'finance', section: 'Disbursements', mins: 14, priority: 15, kind: 'standard', matterRef: 'D585/4', meta: 'D585/4 · 2 unpaid', title: '£267.00 in unpaid disbursements', secondary: 'Review', primary: 'Pay' },
  { id: 'x-p4872-4', lane: 'finance', section: 'Undertakings', mins: 15, priority: 26, kind: 'standard', matterRef: 'P487/2', meta: 'UND-5641 to Barclays', title: 'Discharge of Barclays charge', secondary: 'Review', primary: 'Discharge' },
  { id: 'x-f119-5', lane: 'finance', section: 'Client balances', mins: 25, priority: 22, kind: 'standard', matterRef: 'F11/9', meta: 'F11/9 · Greenway Retail', title: '£2450.50 to return', secondary: 'Review', primary: 'Raise request' },
  { id: 'x-f119-6', lane: 'operations', section: 'Files ready to close', mins: 15, priority: 20, kind: 'standard', matterRef: 'F11/9', meta: 'F11/9 · no activity for 224 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-f119-7', lane: 'operations', section: 'Outstanding tasks', mins: 25, priority: 9, kind: 'standard', matterRef: 'F11/9', meta: 'F11/9 · 5 overdue by 3 days', title: '5 tasks still open', secondary: 'Review', primary: 'Remove' },
  { id: 'x-a87-8', lane: 'finance', section: 'Work in progress', mins: 25, priority: 8, kind: 'standard', matterRef: 'A8/7', meta: 'A8/7 · 5 unbilled entries', title: '£2910.50 unbilled', secondary: 'Review', primary: 'Write off' },
  { id: 'x-a87-9', lane: 'operations', section: 'Files ready to close', mins: 9, priority: 14, kind: 'standard', matterRef: 'A8/7', meta: 'A8/7 · no activity for 371 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-q7653-10', lane: 'operations', section: 'Key dates to confirm', mins: 3, priority: 12, kind: 'standard', matterRef: 'Q765/3', meta: 'Q765/3 · 19 May 2026', title: '3 dates after today', secondary: 'Review', primary: 'Remove' },
  { id: 'x-t8804-11', lane: 'finance', section: 'Undertakings', mins: 7, priority: 15, kind: 'standard', matterRef: 'T880/4', meta: 'UND-4952 to NatWest', title: 'Discharge of NatWest charge', secondary: 'Review', primary: 'Discharge' },
  { id: 'x-b9804-12', lane: 'finance', section: 'Undertakings', mins: 18, priority: 21, kind: 'standard', matterRef: 'B980/4', meta: 'UND-8408 to Coventry BS', title: 'Discharge of Coventry BS charge', secondary: 'Review', primary: 'Discharge' },
  { id: 'x-a824-13', lane: 'operations', section: 'AML checks', mins: 7, priority: 21, kind: 'standard', matterRef: 'A82/4', meta: 'A82/4 · ID expired', title: 'Source of funds not evidenced', secondary: 'Review', primary: 'Request' },
  { id: 'x-b3414-14', lane: 'finance', section: 'Client balances', mins: 25, priority: 7, kind: 'standard', matterRef: 'B341/4', meta: 'B341/4 · Brackenhill Ltd', title: '£4193.00 held on account', secondary: 'Review', primary: 'Raise request' },
  { id: 'x-b3414-15', lane: 'operations', section: 'Outstanding tasks', mins: 6, priority: 21, kind: 'standard', matterRef: 'B341/4', meta: 'B341/4 · 1 overdue by 11 days', title: '1 task still open', secondary: 'Review', primary: 'Remove' },
  { id: 'x-r2293-16', lane: 'finance', section: 'Work in progress', mins: 5, priority: 11, kind: 'standard', matterRef: 'R229/3', meta: 'R229/3 · 3 unbilled entries', title: '£1247.25 unbilled', secondary: 'Review', primary: 'Write off' },
  { id: 'x-600021-17', lane: 'operations', section: 'AML checks', mins: 25, priority: 17, kind: 'standard', matterRef: '60002/1', meta: '60002/1 · source of funds missing', title: 'Proof of address out of date', secondary: 'Review', primary: 'Request' },
  { id: 'x-600021-18', lane: 'operations', section: 'Files ready to close', mins: 5, priority: 4, kind: 'standard', matterRef: '60002/1', meta: '60002/1 · no activity for 138 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-600021-19', lane: 'finance', section: 'Work in progress', mins: 8, priority: 29, kind: 'standard', matterRef: '60002/1', meta: '60002/1 · 6 unbilled entries', title: '£1891.00 unbilled', secondary: 'Review', primary: 'Write off' },
  { id: 'x-l7663-20', lane: 'operations', section: 'AML checks', mins: 7, priority: 29, kind: 'standard', matterRef: 'L766/3', meta: 'L766/3 · ID expired', title: 'Source of funds not evidenced', secondary: 'Review', primary: 'Request' },
  { id: 'x-c994-21', lane: 'finance', section: 'Client balances', mins: 12, priority: 15, kind: 'standard', matterRef: 'C99/4', meta: 'C99/4 · Marcus Smith', title: '£2088.00 to return', secondary: 'Review', primary: 'Raise request' },
  { id: 'x-c994-22', lane: 'finance', section: 'Work in progress', mins: 7, priority: 19, kind: 'standard', matterRef: 'C99/4', meta: 'C99/4 · 4 unbilled entries', title: '£2709.00 unbilled', secondary: 'Review', primary: 'Write off' },
  { id: 'x-j5701-23', lane: 'finance', section: 'Work in progress', mins: 10, priority: 6, kind: 'standard', matterRef: 'J570/1', meta: 'J570/1 · 6 unbilled entries', title: '£1068.25 unbilled', secondary: 'Review', primary: 'Write off' },
  { id: 'x-j5701-24', lane: 'finance', section: 'Client balances', mins: 18, priority: 22, kind: 'standard', matterRef: 'J570/1', meta: 'J570/1 · Callum Jephcott', title: '£1525.75 held on account', secondary: 'Review', primary: 'Raise request' },
  { id: 'x-a11-25', lane: 'finance', section: 'Disbursements', mins: 6, priority: 28, kind: 'standard', matterRef: 'A1/1', meta: 'A1/1 · 4 unpaid', title: '£72.50 in unpaid disbursements', secondary: 'Review', primary: 'Pay' },
  { id: 'x-a11-26', lane: 'operations', section: 'AML checks', mins: 4, priority: 18, kind: 'standard', matterRef: 'A1/1', meta: 'A1/1 · ID expired', title: 'Proof of address out of date', secondary: 'Review', primary: 'Request' },
  { id: 'x-s8892-27', lane: 'operations', section: 'Key dates to confirm', mins: 18, priority: 2, kind: 'standard', matterRef: 'S889/2', meta: 'S889/2 · 22 Aug 2026', title: '3 dates after today', secondary: 'Review', primary: 'Remove' },
  { id: 'x-s8892-28', lane: 'finance', section: 'Client balances', mins: 18, priority: 12, kind: 'standard', matterRef: 'S889/2', meta: 'S889/2 · Stanmore Ltd', title: '£3952.00 held on account', secondary: 'Review', primary: 'Raise request' },
  { id: 'x-s8892-29', lane: 'operations', section: 'Outstanding tasks', mins: 10, priority: 24, kind: 'standard', matterRef: 'S889/2', meta: 'S889/2 · 2 overdue by 14 days', title: '2 task still open', secondary: 'Review', primary: 'Remove' },
  { id: 'x-b6774-30', lane: 'finance', section: 'Client balances', mins: 7, priority: 11, kind: 'standard', matterRef: 'B677/4', meta: 'B677/4 · Ewan Blackwood', title: '£3704.50 to return', secondary: 'Review', primary: 'Raise request' },
  { id: 'x-b6774-31', lane: 'operations', section: 'Outstanding tasks', mins: 15, priority: 11, kind: 'standard', matterRef: 'B677/4', meta: 'B677/4 · 4 overdue by 20 days', title: '4 task still open', secondary: 'Review', primary: 'Remove' },
  { id: 'x-b6774-32', lane: 'finance', section: 'Work in progress', mins: 5, priority: 7, kind: 'standard', matterRef: 'B677/4', meta: 'B677/4 · 5 unbilled entries', title: '£3723.75 unbilled', secondary: 'Review', primary: 'Write off' },
  { id: 'x-c2223-33', lane: 'operations', section: 'Files ready to close', mins: 15, priority: 14, kind: 'standard', matterRef: 'C222/3', meta: 'C222/3 · no activity for 234 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-n1213-34', lane: 'finance', section: 'Disbursements', mins: 20, priority: 14, kind: 'standard', matterRef: 'N121/3', meta: 'N121/3 · 6 unpaid', title: '£252.00 in unpaid disbursements', secondary: 'Review', primary: 'Pay' },
  { id: 'x-n1213-35', lane: 'finance', section: 'Client balances', mins: 8, priority: 6, kind: 'standard', matterRef: 'N121/3', meta: 'N121/3 · Beth Nuttall', title: '£4554.00 held on account', secondary: 'Review', primary: 'Raise request' },
  { id: 'x-j3502-36', lane: 'operations', section: 'Key dates to confirm', mins: 5, priority: 2, kind: 'standard', matterRef: 'J350/2', meta: 'J350/2 · 12 Aug 2026', title: '5 dates after today', secondary: 'Review', primary: 'Remove' },
  { id: 'x-h9592-37', lane: 'operations', section: 'Files ready to close', mins: 25, priority: 2, kind: 'standard', matterRef: 'H959/2', meta: 'H959/2 · no activity for 337 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-c1581-38', lane: 'finance', section: 'Client balances', mins: 10, priority: 28, kind: 'standard', matterRef: 'C158/1', meta: 'C158/1 · Zoe Copeland', title: '£2848.00 held on account', secondary: 'Review', primary: 'Raise request' },
  { id: 'x-k4194-39', lane: 'finance', section: 'Work in progress', mins: 12, priority: 8, kind: 'standard', matterRef: 'K419/4', meta: 'K419/4 · 1 unbilled entries', title: '£2124.00 unbilled', secondary: 'Review', primary: 'Write off' },
  { id: 'x-k4194-40', lane: 'operations', section: 'Files ready to close', mins: 5, priority: 12, kind: 'standard', matterRef: 'K419/4', meta: 'K419/4 · no activity for 165 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-k4194-41', lane: 'operations', section: 'Outstanding tasks', mins: 9, priority: 29, kind: 'standard', matterRef: 'K419/4', meta: 'K419/4 · 5 overdue by 21 days', title: '5 task still open', secondary: 'Review', primary: 'Remove' },
  { id: 'x-a2043-42', lane: 'finance', section: 'Disbursements', mins: 9, priority: 23, kind: 'standard', matterRef: 'A204/3', meta: 'A204/3 · 1 unpaid', title: '£335.50 in unpaid disbursements', secondary: 'Review', primary: 'Pay' },
  { id: 'x-a2043-43', lane: 'finance', section: 'Undertakings', mins: 14, priority: 3, kind: 'standard', matterRef: 'A204/3', meta: 'UND-1220 to Halifax', title: 'Discharge of Halifax charge', secondary: 'Review', primary: 'Discharge' },
  { id: 'x-a2043-44', lane: 'operations', section: 'Files ready to close', mins: 20, priority: 11, kind: 'standard', matterRef: 'A204/3', meta: 'A204/3 · no activity for 313 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-b532-45', lane: 'finance', section: 'Client balances', mins: 6, priority: 28, kind: 'standard', matterRef: 'B53/2', meta: 'B53/2 · Brackenhill Ltd', title: '£1886.00 to return', secondary: 'Review', primary: 'Raise request' },
  { id: 'x-a16622-46', lane: 'operations', section: 'Outstanding tasks', mins: 4, priority: 25, kind: 'standard', matterRef: 'A1662/2', meta: 'A1662/2 · 3 overdue by 10 days', title: '3 tasks still open', secondary: 'Review', primary: 'Remove' },
  { id: 'x-m8353-47', lane: 'finance', section: 'Client balances', mins: 7, priority: 14, kind: 'standard', matterRef: 'M835/3', meta: 'M835/3 · Mereside Holdings Ltd', title: '£1138.75 to return', secondary: 'Review', primary: 'Raise request' },
  { id: 'x-m8353-48', lane: 'operations', section: 'AML checks', mins: 5, priority: 23, kind: 'standard', matterRef: 'M835/3', meta: 'M835/3 · source of funds missing', title: 'Source of funds not evidenced', secondary: 'Review', primary: 'Request' },
  { id: 'x-e8932-49', lane: 'finance', section: 'Client balances', mins: 18, priority: 21, kind: 'standard', matterRef: 'E893/2', meta: 'E893/2 · Laura Ellingham', title: '£785.75 to return', secondary: 'Review', primary: 'Raise request' },
  { id: 'x-e8932-50', lane: 'operations', section: 'Key dates to confirm', mins: 8, priority: 22, kind: 'standard', matterRef: 'E893/2', meta: 'E893/2 · 13 Dec 2026', title: 'One date after today', secondary: 'Review', primary: 'Remove' },
  { id: 'x-l3732-51', lane: 'finance', section: 'Work in progress', mins: 14, priority: 10, kind: 'standard', matterRef: 'L373/2', meta: 'L373/2 · 6 unbilled entries', title: '£492.50 unbilled', secondary: 'Review', primary: 'Write off' },
  { id: 'x-l3732-52', lane: 'operations', section: 'Outstanding tasks', mins: 10, priority: 15, kind: 'standard', matterRef: 'L373/2', meta: 'L373/2 · 3 overdue by 13 days', title: '3 tasks still open', secondary: 'Review', primary: 'Remove' },
  { id: 'x-i8591-53', lane: 'operations', section: 'AML checks', mins: 12, priority: 8, kind: 'standard', matterRef: 'I859/1', meta: 'I859/1 · source of funds missing', title: 'Proof of address out of date', secondary: 'Review', primary: 'Request' },
  { id: 'x-h4883-54', lane: 'operations', section: 'Files ready to close', mins: 20, priority: 18, kind: 'standard', matterRef: 'H488/3', meta: 'H488/3 · no activity for 146 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-j6612-55', lane: 'finance', section: 'Work in progress', mins: 12, priority: 3, kind: 'standard', matterRef: 'J661/2', meta: 'J661/2 · 1 unbilled entries', title: '£1840.75 unbilled', secondary: 'Review', primary: 'Write off' },
  { id: 'x-j6612-56', lane: 'operations', section: 'AML checks', mins: 18, priority: 13, kind: 'standard', matterRef: 'J661/2', meta: 'J661/2 · ID expired', title: 'Source of funds not evidenced', secondary: 'Review', primary: 'Request' },
  { id: 'x-g5292-57', lane: 'finance', section: 'Disbursements', mins: 20, priority: 13, kind: 'standard', matterRef: 'G529/2', meta: 'G529/2 · 1 unpaid', title: '£96.00 in unpaid disbursements', secondary: 'Review', primary: 'Pay' },
  { id: 'x-a9394-58', lane: 'operations', section: 'Key dates to confirm', mins: 10, priority: 2, kind: 'standard', matterRef: 'A939/4', meta: 'A939/4 · 07 Jan 2026', title: '6 dates after today', secondary: 'Review', primary: 'Remove' },
  { id: 'x-a9394-59', lane: 'operations', section: 'Outstanding tasks', mins: 7, priority: 25, kind: 'standard', matterRef: 'A939/4', meta: 'A939/4 · 4 overdue by 8 days', title: '4 task still open', secondary: 'Review', primary: 'Remove' },
  { id: 'x-v6181-60', lane: 'finance', section: 'Undertakings', mins: 25, priority: 17, kind: 'standard', matterRef: 'V618/1', meta: 'UND-1202 to Skipton', title: 'Discharge of Skipton charge', secondary: 'Review', primary: 'Discharge' },
  { id: 'x-v6181-61', lane: 'operations', section: 'Files ready to close', mins: 14, priority: 23, kind: 'standard', matterRef: 'V618/1', meta: 'V618/1 · no activity for 156 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-v6181-62', lane: 'finance', section: 'Disbursements', mins: 12, priority: 28, kind: 'standard', matterRef: 'V618/1', meta: 'V618/1 · 3 unpaid', title: '£152.00 in unpaid disbursements', secondary: 'Review', primary: 'Pay' },
  { id: 'x-o5732-63', lane: 'finance', section: 'Work in progress', mins: 8, priority: 12, kind: 'standard', matterRef: 'O573/2', meta: 'O573/2 · 1 unbilled entries', title: '£1611.00 unbilled', secondary: 'Review', primary: 'Write off' },
  { id: 'x-k8341-64', lane: 'operations', section: 'AML checks', mins: 10, priority: 13, kind: 'standard', matterRef: 'K834/1', meta: 'K834/1 · ID expired', title: 'Source of funds not evidenced', secondary: 'Review', primary: 'Request' },
  { id: 'x-k8341-65', lane: 'operations', section: 'Key dates to confirm', mins: 18, priority: 9, kind: 'standard', matterRef: 'K834/1', meta: 'K834/1 · 21 Dec 2026', title: 'One date after today', secondary: 'Review', primary: 'Remove' },
  { id: 'x-k8341-66', lane: 'finance', section: 'Work in progress', mins: 20, priority: 11, kind: 'standard', matterRef: 'K834/1', meta: 'K834/1 · 5 unbilled entries', title: '£1333.00 unbilled', secondary: 'Review', primary: 'Write off' },
  { id: 'x-p1523-67', lane: 'finance', section: 'Client balances', mins: 15, priority: 18, kind: 'standard', matterRef: 'P152/3', meta: 'P152/3 · Beth Prendergast', title: '£1390.50 held on account', secondary: 'Review', primary: 'Raise request' },
  { id: 'x-p1523-68', lane: 'operations', section: 'Files ready to close', mins: 4, priority: 10, kind: 'standard', matterRef: 'P152/3', meta: 'P152/3 · no activity for 394 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-p1523-69', lane: 'operations', section: 'Key dates to confirm', mins: 18, priority: 22, kind: 'standard', matterRef: 'P152/3', meta: 'P152/3 · 01 Dec 2026', title: '3 dates after today', secondary: 'Review', primary: 'Remove' },
  { id: 'x-p3051-70', lane: 'finance', section: 'Disbursements', mins: 12, priority: 25, kind: 'standard', matterRef: 'P305/1', meta: 'P305/1 · 3 unpaid', title: '£315.50 in unpaid disbursements', secondary: 'Review', primary: 'Pay' },
  { id: 'x-h4913-71', lane: 'operations', section: 'Files ready to close', mins: 20, priority: 29, kind: 'standard', matterRef: 'H491/3', meta: 'H491/3 · no activity for 260 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-s873-72', lane: 'finance', section: 'Work in progress', mins: 18, priority: 3, kind: 'standard', matterRef: 'S87/3', meta: 'S87/3 · 1 unbilled entries', title: '£4795.00 unbilled', secondary: 'Review', primary: 'Write off' },
  { id: 'x-s873-73', lane: 'operations', section: 'Files ready to close', mins: 4, priority: 23, kind: 'standard', matterRef: 'S87/3', meta: 'S87/3 · no activity for 289 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-s873-74', lane: 'finance', section: 'Client balances', mins: 20, priority: 3, kind: 'standard', matterRef: 'S87/3', meta: 'S87/3 · Martin Sandiford', title: '£785.25 held on account', secondary: 'Review', primary: 'Raise request' },
  { id: 'x-p2304-75', lane: 'finance', section: 'Client balances', mins: 3, priority: 12, kind: 'standard', matterRef: 'P230/4', meta: 'P230/4 · Pemberley Ltd', title: '£2328.50 held on account', secondary: 'Review', primary: 'Raise request' },
  { id: 'x-p2304-76', lane: 'operations', section: 'AML checks', mins: 9, priority: 11, kind: 'standard', matterRef: 'P230/4', meta: 'P230/4 · source of funds missing', title: 'Proof of address out of date', secondary: 'Review', primary: 'Request' },
  { id: 'x-i341-77', lane: 'operations', section: 'AML checks', mins: 4, priority: 22, kind: 'standard', matterRef: 'I34/1', meta: 'I34/1 · source of funds missing', title: 'Proof of address out of date', secondary: 'Review', primary: 'Request' },
  { id: 'x-i341-78', lane: 'operations', section: 'Key dates to confirm', mins: 3, priority: 5, kind: 'standard', matterRef: 'I34/1', meta: 'I34/1 · 06 Jun 2026', title: 'One date after today', secondary: 'Review', primary: 'Remove' },
  { id: 'x-i341-79', lane: 'operations', section: 'Files ready to close', mins: 7, priority: 6, kind: 'standard', matterRef: 'I34/1', meta: 'I34/1 · no activity for 355 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-d7714-80', lane: 'operations', section: 'Files ready to close', mins: 5, priority: 24, kind: 'standard', matterRef: 'D771/4', meta: 'D771/4 · no activity for 120 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-q7542-81', lane: 'finance', section: 'Work in progress', mins: 8, priority: 21, kind: 'standard', matterRef: 'Q754/2', meta: 'Q754/2 · 5 unbilled entries', title: '£4144.00 unbilled', secondary: 'Review', primary: 'Write off' },
  { id: 'x-d4002-82', lane: 'finance', section: 'Client balances', mins: 7, priority: 26, kind: 'standard', matterRef: 'D400/2', meta: 'D400/2 · Umar Dalgleish', title: '£4089.75 held on account', secondary: 'Review', primary: 'Raise request' },
  { id: 'x-h4862-83', lane: 'operations', section: 'Outstanding tasks', mins: 3, priority: 27, kind: 'standard', matterRef: 'H486/2', meta: 'H486/2 · 6 overdue by 12 days', title: '6 tasks still open', secondary: 'Review', primary: 'Remove' },
  { id: 'x-h4862-84', lane: 'finance', section: 'Client balances', mins: 7, priority: 19, kind: 'standard', matterRef: 'H486/2', meta: 'H486/2 · Iain Holbrook', title: '£4111.00 to return', secondary: 'Review', primary: 'Raise request' },
  { id: 'x-l6084-85', lane: 'operations', section: 'Files ready to close', mins: 8, priority: 19, kind: 'standard', matterRef: 'L608/4', meta: 'L608/4 · no activity for 161 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-l6084-86', lane: 'operations', section: 'Key dates to confirm', mins: 15, priority: 17, kind: 'standard', matterRef: 'L608/4', meta: 'L608/4 · 11 Jun 2026', title: 'One date after today', secondary: 'Review', primary: 'Remove' },
  { id: 'x-q1413-87', lane: 'operations', section: 'AML checks', mins: 5, priority: 11, kind: 'standard', matterRef: 'Q141/3', meta: 'Q141/3 · source of funds missing', title: 'Source of funds not evidenced', secondary: 'Review', primary: 'Request' },
  { id: 'x-q1413-88', lane: 'finance', section: 'Undertakings', mins: 8, priority: 6, kind: 'standard', matterRef: 'Q141/3', meta: 'UND-4309 to Together', title: 'Undertaking still open', secondary: 'Review', primary: 'Discharge' },
  { id: 'x-q1413-89', lane: 'finance', section: 'Client balances', mins: 18, priority: 9, kind: 'standard', matterRef: 'Q141/3', meta: 'Q141/3 · Quarrywood Ltd', title: '£2349.50 to return', secondary: 'Review', primary: 'Raise request' },
  { id: 'x-k6541-90', lane: 'operations', section: 'Files ready to close', mins: 9, priority: 24, kind: 'standard', matterRef: 'K654/1', meta: 'K654/1 · no activity for 153 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-c8681-91', lane: 'operations', section: 'Outstanding tasks', mins: 6, priority: 13, kind: 'standard', matterRef: 'C868/1', meta: 'C868/1 · 6 overdue by 8 days', title: '6 tasks still open', secondary: 'Review', primary: 'Remove' },
  { id: 'x-c8681-92', lane: 'operations', section: 'Key dates to confirm', mins: 18, priority: 6, kind: 'standard', matterRef: 'C868/1', meta: 'C868/1 · 15 Sep 2026', title: 'One date after today', secondary: 'Review', primary: 'Remove' },
  { id: 'x-c8681-93', lane: 'finance', section: 'Undertakings', mins: 7, priority: 4, kind: 'standard', matterRef: 'C868/1', meta: 'UND-8478 to Together', title: 'Discharge of Together charge', secondary: 'Review', primary: 'Discharge' },
  { id: 'x-q6114-94', lane: 'operations', section: 'AML checks', mins: 3, priority: 16, kind: 'standard', matterRef: 'Q611/4', meta: 'Q611/4 · source of funds missing', title: 'Proof of address out of date', secondary: 'Review', primary: 'Request' },
  { id: 'x-f1803-95', lane: 'finance', section: 'Disbursements', mins: 8, priority: 27, kind: 'standard', matterRef: 'F180/3', meta: 'F180/3 · 3 unpaid', title: '£285.00 in unpaid disbursements', secondary: 'Review', primary: 'Pay' },
  { id: 'x-f1803-96', lane: 'operations', section: 'Key dates to confirm', mins: 3, priority: 21, kind: 'standard', matterRef: 'F180/3', meta: 'F180/3 · 12 Sep 2026', title: '3 dates after today', secondary: 'Review', primary: 'Remove' },
  { id: 'x-f1803-97', lane: 'operations', section: 'Files ready to close', mins: 8, priority: 16, kind: 'standard', matterRef: 'F180/3', meta: 'F180/3 · no activity for 265 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-o3341-98', lane: 'operations', section: 'AML checks', mins: 8, priority: 13, kind: 'standard', matterRef: 'O334/1', meta: 'O334/1 · ID expired', title: 'Proof of address out of date', secondary: 'Review', primary: 'Request' },
  { id: 'x-o3341-99', lane: 'operations', section: 'Key dates to confirm', mins: 9, priority: 22, kind: 'standard', matterRef: 'O334/1', meta: 'O334/1 · 06 Dec 2026', title: '4 dates after today', secondary: 'Review', primary: 'Remove' },
  { id: 'x-v4113-100', lane: 'finance', section: 'Work in progress', mins: 18, priority: 23, kind: 'standard', matterRef: 'V411/3', meta: 'V411/3 · 1 unbilled entries', title: '£4717.75 unbilled', secondary: 'Review', primary: 'Write off' },
  { id: 'x-p1241-101', lane: 'operations', section: 'Files ready to close', mins: 14, priority: 18, kind: 'standard', matterRef: 'P124/1', meta: 'P124/1 · no activity for 144 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-p1241-102', lane: 'operations', section: 'AML checks', mins: 20, priority: 12, kind: 'standard', matterRef: 'P124/1', meta: 'P124/1 · source of funds missing', title: 'Source of funds not evidenced', secondary: 'Review', primary: 'Request' },
  { id: 'x-l932-103', lane: 'finance', section: 'Disbursements', mins: 20, priority: 6, kind: 'standard', matterRef: 'L93/2', meta: 'L93/2 · 2 unpaid', title: '£312.25 in unpaid disbursements', secondary: 'Review', primary: 'Pay' },
  { id: 'x-l932-104', lane: 'operations', section: 'Files ready to close', mins: 20, priority: 25, kind: 'standard', matterRef: 'L93/2', meta: 'L93/2 · no activity for 249 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-l932-105', lane: 'finance', section: 'Undertakings', mins: 25, priority: 22, kind: 'standard', matterRef: 'L93/2', meta: 'UND-4709 to Coventry BS', title: 'Undertaking still open', secondary: 'Review', primary: 'Discharge' },
  { id: 'x-p901-106', lane: 'operations', section: 'AML checks', mins: 12, priority: 24, kind: 'standard', matterRef: 'P90/1', meta: 'P90/1 · source of funds missing', title: 'Source of funds not evidenced', secondary: 'Review', primary: 'Request' },
  { id: 'x-p901-107', lane: 'finance', section: 'Client balances', mins: 18, priority: 18, kind: 'standard', matterRef: 'P90/1', meta: 'P90/1 · Ewan Pargeter', title: '£1629.25 held on account', secondary: 'Review', primary: 'Raise request' },
  { id: 'x-p901-108', lane: 'operations', section: 'Files ready to close', mins: 8, priority: 19, kind: 'standard', matterRef: 'P90/1', meta: 'P90/1 · no activity for 367 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-k4294-109', lane: 'operations', section: 'AML checks', mins: 10, priority: 24, kind: 'standard', matterRef: 'K429/4', meta: 'K429/4 · source of funds missing', title: 'Proof of address out of date', secondary: 'Review', primary: 'Request' },
  { id: 'x-k4294-110', lane: 'operations', section: 'Outstanding tasks', mins: 5, priority: 20, kind: 'standard', matterRef: 'K429/4', meta: 'K429/4 · 3 overdue by 17 days', title: '3 task still open', secondary: 'Review', primary: 'Remove' },
  { id: 'x-k4294-111', lane: 'operations', section: 'Files ready to close', mins: 20, priority: 18, kind: 'standard', matterRef: 'K429/4', meta: 'K429/4 · no activity for 304 days', title: 'Matter looks complete', secondary: 'Review', primary: 'Close' },
  { id: 'x-f934-112', lane: 'finance', section: 'Disbursements', mins: 15, priority: 28, kind: 'standard', matterRef: 'F93/4', meta: 'F93/4 · 5 unpaid', title: '£266.00 in unpaid disbursements', secondary: 'Review', primary: 'Pay' },
  { id: 'x-f934-113', lane: 'finance', section: 'Work in progress', mins: 4, priority: 22, kind: 'standard', matterRef: 'F93/4', meta: 'F93/4 · 5 unbilled entries', title: '£1354.00 unbilled', secondary: 'Review', primary: 'Write off' },
  { id: 'x-f934-114', lane: 'finance', section: 'Client balances', mins: 9, priority: 12, kind: 'standard', matterRef: 'F93/4', meta: 'F93/4 · Fernbank Ltd', title: '£2668.00 to return', secondary: 'Review', primary: 'Raise request' },
]);

// Fixed display order for the section groups inside each column, so the
// column reads in a sensible working order rather than in whatever order
// the packer happened to pull the tasks out.
HALO.sectionOrder = {
  finance: ['Undertakings', 'Client balances', 'Work in progress', 'Disbursements'],
  operations: ['Outstanding tasks', 'Key dates to confirm', 'AML checks', 'Files ready to close'],
  communications: ['Closing letter', 'Review request', 'Draft replies to clients', 'Chase the other side'],
};
