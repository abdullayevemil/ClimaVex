import type { Locale, RiskLevel } from "./types";

type RiskLabels = Record<RiskLevel, string>;

export type Dictionary = {
  language: string;
  risk: RiskLabels;
  regionType: {
    FARM: string;
    DISTRICT: string;
    PORTFOLIO: string;
  };
  nav: {
    dashboard: string;
    regions: string;
    portfolio: string;
    reports: string;
  };
  topbar: {
    productLine: string;
    search: string;
    institutionProfile: string;
    riskAlerts: string;
  };
  sidebar: {
    engineTitle: string;
    engineBody: string;
  };
  dashboard: {
    eyebrow: string;
    title: string;
    subtitle: string;
    issueTitle: string;
    noticeTitle: string;
    noticeBody: string;
    mapTitle: string;
    mapDescription: string;
    selected: string;
    latestSnapshot: string;
    selectRegionPrompt: string;
    noExplanation: string;
    loadingMap: string;
    unableSelected: string;
    unableDashboard: string;
    unableGenerate: string;
  };
  selector: {
    placeholder: string;
  };
  generate: {
    label: string;
  };
  portfolioCards: {
    totalExposure: string;
    weightedRisk: string;
    regionsMonitored: string;
    highRiskRegions: string;
    unavailable: string;
    exposureAdjusted: string;
    regionTypes: string;
    closerReview: string;
  };
  riskScore: {
    title: string;
    noAssessment: string;
    engine: string;
    currentAssessment: string;
    riskSuffix: string;
    drought: string;
    flood: string;
    soil: string;
    yield: string;
  };
  climate: {
    title: string;
    latestDescription: string;
    noSnapshot: string;
    rainfall: string;
    temperature: string;
    soilMoisture: string;
    vegetation: string;
    droughtIndex: string;
    floodExposure: string;
    monthlyAccumulation: string;
    meanTemperature: string;
    rootZoneEstimate: string;
    cropVigorSignal: string;
    waterStressSignal: string;
    surfaceWaterHazard: string;
  };
  panels: {
    financialTitle: string;
    financialSubtitle: string;
    financialEmpty: string;
    recommendationTitle: string;
    recommendationEmpty: string;
  };
  assessmentsTable: {
    title: string;
    subtitle: string;
    empty: string;
    date: string;
    level: string;
    score: string;
    drought: string;
    flood: string;
    yield: string;
  };
  chart: {
    title: string;
    subtitle: string;
    empty: string;
    riskTab: string;
    climateTab: string;
    riskScore: string;
    rainfall: string;
    soilMoisture: string;
    vegetation: string;
  };
  financialImpact: {
    title: string;
    subtitle: string;
    empty: string;
    exposure: string;
    expectedLoss: string;
    capitalBuffer: string;
    premiumUplift: string;
    yieldRevenueAtRisk: string;
    liquidityStress: string;
    impactRate: string;
    note: string;
  };
  scenarioProjection: {
    title: string;
    subtitle: string;
    empty: string;
    month: string;
    projectedRisk: string;
    projectedLoss: string;
    scenario: Record<"base" | "dry" | "flood" | "mitigation", string>;
    description: Record<"base" | "dry" | "flood" | "mitigation", string>;
  };
  workflow: {
    morningTitle: string;
    morningSubtitle: string;
    sso: string;
    license: string;
    activeRisk: string;
    overnightAlerts: string;
    pendingQueue: string;
    loanTitle: string;
    loanSubtitle: string;
    applicationQueue: string;
    applicant: string;
    requestedLoan: string;
    tenor: string;
    area: string;
    coordinates: string;
    district: string;
    cropSelection: string;
    runReview: string;
    runningReview: string;
    currentRisk: string;
    viewBreakdown: string;
    hideBreakdown: string;
    factorBreakdown: string;
    dataPipeline: string;
    projections: string;
    scenario: string;
    timeline: string;
    confidenceRange: string;
    creditRecommendation: string;
    reportTitle: string;
    exportReport: string;
    exportingReport: string;
    reportReady: string;
    decisionTitle: string;
    approveWithConditions: string;
    decisionLogged: string;
    auditTrail: string;
    modelDisclosure: string;
    unableLoad: string;
    unableReview: string;
    unableReport: string;
    unableDecision: string;
  };
  portfolioMonitoring: {
    title: string;
    subtitle: string;
    heatMapTitle: string;
    heatMapSubtitle: string;
    alertTitle: string;
    affectedLoans: string;
    exposure: string;
    stressTestTitle: string;
    stressTestBody: string;
    forwardAlert: string;
    forwarded: string;
    unableForward: string;
  };
  regionsPage: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    errorTitle: string;
    tableTitle: string;
    activeRecords: string;
    empty: string;
    region: string;
    type: string;
    crop: string;
    area: string;
    country: string;
    latestRisk: string;
    climateSnapshot: string;
    noSnapshot: string;
    unableLoad: string;
  };
  portfolioPage: {
    title: string;
    subtitle: string;
    issueTitle: string;
    distributionTitle: string;
    distributionSubtitle: string;
    topRiskyTitle: string;
    topRiskySubtitle: string;
    region: string;
    crop: string;
    risk: string;
    exposure: string;
    unableLoad: string;
  };
  reportsPage: {
    eyebrow: string;
    title: string;
    subtitle: string;
    print: string;
    issueTitle: string;
    reportBrand: string;
    reportTitle: string;
    generated: string;
    selectedRegion: string;
    riskLevel: string;
    riskScore: string;
    scoringModel: string;
    assessmentBasis: string;
    climateIndicators: string;
    interpretation: string;
    recommendation: string;
    noInterpretation: string;
    noRecommendation: string;
    selectRegion: string;
    unavailable: string;
    unableLoad: string;
  };
  units: {
    hectares: string;
    celsius: string;
  };
};

export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    language: "Language",
    risk: { LOW: "Low", MEDIUM: "Medium", HIGH: "High" },
    regionType: {
      FARM: "Farm",
      DISTRICT: "District",
      PORTFOLIO: "Portfolio",
    },
    nav: {
      dashboard: "Dashboard",
      regions: "Regions",
      portfolio: "Portfolio",
      reports: "Reports",
    },
    topbar: {
      productLine: "Climate risk intelligence for agricultural finance",
      search: "Search farms, districts, or portfolios",
      institutionProfile: "Institution profile",
      riskAlerts: "Risk alerts",
    },
    sidebar: {
      engineTitle: "MVP scoring engine",
      engineBody:
        "AI-ready climate risk scoring built for credit, insurance, and public-sector portfolio review.",
    },
    dashboard: {
      eyebrow: "Turkey agricultural finance coverage",
      title: "Climate risk command center",
      subtitle:
        "Monitor drought, flood, soil, and yield volatility signals across financed agricultural regions using an AI-ready risk scoring engine.",
      issueTitle: "Dashboard issue",
      noticeTitle: "Assessment updated",
      noticeBody: "A fresh MVP climate risk assessment has been generated.",
      mapTitle: "Geographic risk dashboard",
      mapDescription: "Marker colors reflect the latest region risk level.",
      selected: "Selected",
      latestSnapshot: "Latest climate snapshot",
      selectRegionPrompt: "Select a region to view exposure context.",
      noExplanation: "No scoring explanation is available yet.",
      loadingMap: "Loading geographic risk layer...",
      unableSelected: "Unable to load selected region.",
      unableDashboard: "Unable to load dashboard data.",
      unableGenerate: "Unable to generate assessment.",
    },
    selector: { placeholder: "Select a region" },
    generate: { label: "Generate assessment" },
    portfolioCards: {
      totalExposure: "Total exposure",
      weightedRisk: "Weighted risk",
      regionsMonitored: "Regions monitored",
      highRiskRegions: "High risk regions",
      unavailable: "Portfolio data unavailable",
      exposureAdjusted: "Exposure-adjusted score",
      regionTypes: "Farms, districts, portfolios",
      closerReview: "Requires closer review",
    },
    riskScore: {
      title: "Current risk score",
      noAssessment: "No assessment is available for this region yet.",
      engine: "AI-ready risk scoring engine",
      currentAssessment: "Latest institutional risk assessment",
      riskSuffix: "risk",
      drought: "Drought",
      flood: "Flood",
      soil: "Soil",
      yield: "Yield",
    },
    climate: {
      title: "Climate indicators",
      latestDescription: "Latest observed snapshot for the selected geography.",
      noSnapshot: "No climate snapshot has been recorded for this region.",
      rainfall: "Rainfall",
      temperature: "Temperature",
      soilMoisture: "Soil moisture",
      vegetation: "Vegetation",
      droughtIndex: "Drought index",
      floodExposure: "Flood exposure",
      monthlyAccumulation: "Monthly accumulation",
      meanTemperature: "Mean temperature",
      rootZoneEstimate: "Root zone estimate",
      cropVigorSignal: "Crop vigor signal",
      waterStressSignal: "Water stress signal",
      surfaceWaterHazard: "Surface water hazard",
    },
    panels: {
      financialTitle: "Financial interpretation",
      financialSubtitle: "Credit and underwriting context",
      financialEmpty: "No financial interpretation is available yet.",
      recommendationTitle: "Recommended action",
      recommendationEmpty:
        "Generate or load an assessment to view the recommended action.",
    },
    assessmentsTable: {
      title: "Recent assessments",
      subtitle: "Latest model outputs for audit review.",
      empty: "No assessments have been generated for this region.",
      date: "Date",
      level: "Level",
      score: "Score",
      drought: "Drought",
      flood: "Flood",
      yield: "Yield",
    },
    chart: {
      title: "Risk trend",
      subtitle: "Monthly risk and climate indicators",
      empty: "No climate or assessment history is available for this region.",
      riskTab: "Risk",
      climateTab: "Climate",
      riskScore: "Risk score",
      rainfall: "Rainfall mm",
      soilMoisture: "Soil moisture",
      vegetation: "Vegetation x100",
    },
    financialImpact: {
      title: "Financial impact estimate",
      subtitle: "Numerical case view for the selected exposure",
      empty: "Select a region with an assessment to view impact estimates.",
      exposure: "Exposure amount",
      expectedLoss: "Expected climate loss",
      capitalBuffer: "Capital buffer",
      premiumUplift: "Premium uplift",
      yieldRevenueAtRisk: "Yield revenue at risk",
      liquidityStress: "Liquidity stress",
      impactRate: "Modeled impact rate",
      note: "MVP estimate based on current risk score, sub-risk drivers, and portfolio exposure.",
    },
    scenarioProjection: {
      title: "Scenario projection",
      subtitle: "12-month forecast paths for credit and insurance review",
      empty: "Select a region with an assessment to view scenario projections.",
      month: "Month",
      projectedRisk: "Projected risk",
      projectedLoss: "Projected loss",
      scenario: {
        base: "Base case",
        dry: "Dry season stress",
        flood: "Flood shock",
        mitigation: "Mitigation case",
      },
      description: {
        base: "Current risk drivers continue with modest seasonal drift.",
        dry: "Rainfall deficit and heat stress intensify during the financing cycle.",
        flood: "High rainfall and saturated soil conditions pressure insured losses.",
        mitigation: "Irrigation, monitoring, and risk transfer reduce modeled pressure.",
      },
    },
    workflow: {
      morningTitle: "Normal operations, 08:30",
      morningSubtitle:
        "Simulated internal-portal SSO session for Aysel with license, alerts, and pending climate reviews loaded.",
      sso: "SSO authenticated",
      license: "License tier",
      activeRisk: "Active portfolio risk",
      overnightAlerts: "Overnight alerts",
      pendingQueue: "Pending reviews",
      loanTitle: "Loan review workflow, 09:00",
      loanSubtitle:
        "Karaman wheat loan case using crop-sensitive MVP scoring, explainability, projections, and credit decision logging.",
      applicationQueue: "Application queue",
      applicant: "Applicant",
      requestedLoan: "Requested loan",
      tenor: "Tenor",
      area: "Area",
      coordinates: "Coordinates",
      district: "District",
      cropSelection: "Crop selection",
      runReview: "Generate risk score",
      runningReview: "Scoring 3-5 second workflow...",
      currentRisk: "Current risk",
      viewBreakdown: "View breakdown",
      hideBreakdown: "Hide breakdown",
      factorBreakdown: "SHAP-style factor breakdown",
      dataPipeline: "Data source signals",
      projections: "Future projections",
      scenario: "Scenario",
      timeline: "Timeline",
      confidenceRange: "Confidence range",
      creditRecommendation: "Credit adjustment recommendation",
      reportTitle: "Credit risk report",
      exportReport: "Export credit risk report",
      exportingReport: "Generating report packet...",
      reportReady: "PDF-ready report packet generated",
      decisionTitle: "Decision and audit log",
      approveWithConditions: "Approve with modified conditions",
      decisionLogged: "Decision logged for audit",
      auditTrail: "Audit trail",
      modelDisclosure:
        "MVP climate risk scoring model. External satellite, MGM, and XGBoost integrations are represented as AI-ready connector points in this demo.",
      unableLoad: "Unable to load workflow data.",
      unableReview: "Unable to generate loan climate review.",
      unableReport: "Unable to generate report packet.",
      unableDecision: "Unable to log credit decision.",
    },
    portfolioMonitoring: {
      title: "Portfolio monitoring, 14:00",
      subtitle:
        "Heat-map view of 340 active agricultural loans with overnight climate alerts and stress-test actions.",
      heatMapTitle: "Loan book heat map",
      heatMapSubtitle: "Colored cells simulate individual loan climate-risk status.",
      alertTitle: "Overnight cluster alert",
      affectedLoans: "Affected loans",
      exposure: "Cluster exposure",
      stressTestTitle: "2012-level drought stress test",
      stressTestBody:
        "Estimated default pressure rises by 22-29% for the flagged Karaman cluster under a repeat drought stress.",
      forwardAlert: "Forward to risk manager",
      forwarded: "Alert forwarded with stress-test packet",
      unableForward: "Unable to forward alert.",
    },
    regionsPage: {
      title: "Region management",
      subtitle:
        "Review monitored farms, districts, and portfolio geographies with their latest climate and financial risk signals.",
      searchPlaceholder: "Search regions or crop types",
      errorTitle: "Unable to load regions",
      tableTitle: "Monitored geographies",
      activeRecords: "active records in the MVP portfolio.",
      empty: "No region matches the current search.",
      region: "Region",
      type: "Type",
      crop: "Crop",
      area: "Area",
      country: "Country",
      latestRisk: "Latest risk",
      climateSnapshot: "Climate snapshot",
      noSnapshot: "No snapshot",
      unableLoad: "Unable to load regions.",
    },
    portfolioPage: {
      title: "Portfolio risk overview",
      subtitle:
        "Exposure-weighted climate risk view for agricultural lending, insurance, and public guarantee portfolios.",
      issueTitle: "Portfolio issue",
      distributionTitle: "Risk distribution",
      distributionSubtitle: "Count of regions by latest assessment.",
      topRiskyTitle: "Top risky regions",
      topRiskySubtitle: "Ranked by latest score and exposure relevance.",
      region: "Region",
      crop: "Crop",
      risk: "Risk",
      exposure: "Exposure",
      unableLoad: "Unable to load portfolio.",
    },
    reportsPage: {
      eyebrow: "Generate Bank Risk Report",
      title: "Report preview",
      subtitle:
        "A printable institutional summary for credit committees, underwriting teams, and public guarantee programs.",
      print: "Print preview",
      issueTitle: "Report issue",
      reportBrand: "ClimaVex Climate Finance Intelligence",
      reportTitle: "Agricultural Climate Risk Report",
      generated: "Generated",
      selectedRegion: "Selected region",
      riskLevel: "Risk level",
      riskScore: "Risk score",
      scoringModel: "MVP climate risk scoring model",
      assessmentBasis: "Latest assessment basis",
      climateIndicators: "Climate indicators",
      interpretation: "Bank-style interpretation",
      recommendation: "Recommended action",
      noInterpretation: "No financial interpretation has been generated.",
      noRecommendation: "No recommended action has been generated.",
      selectRegion: "Select a region to generate a report preview.",
      unavailable: "Unavailable",
      unableLoad: "Unable to load report data.",
    },
    units: { hectares: "ha", celsius: "C" },
  },
  az: {
    language: "Dil",
    risk: { LOW: "Aşağı", MEDIUM: "Orta", HIGH: "Yüksək" },
    regionType: {
      FARM: "Ferma",
      DISTRICT: "Rayon",
      PORTFOLIO: "Portfel",
    },
    nav: {
      dashboard: "Panel",
      regions: "Regionlar",
      portfolio: "Portfel",
      reports: "Hesabatlar",
    },
    topbar: {
      productLine: "Kənd təsərrüfatı maliyyəsi üçün iqlim riski analitikası",
      search: "Fermalar, rayonlar və ya portfellər üzrə axtarış",
      institutionProfile: "Təşkilat profili",
      riskAlerts: "Risk bildirişləri",
    },
    sidebar: {
      engineTitle: "MVP qiymətləndirmə mühərriki",
      engineBody:
        "Kredit, sığorta və dövlət sektoru portfel baxışı üçün AI-yə hazır iqlim riski qiymətləndirməsi.",
    },
    dashboard: {
      eyebrow: "Türkiyə kənd təsərrüfatı maliyyəsi əhatəsi",
      title: "İqlim riski idarəetmə paneli",
      subtitle:
        "Maliyyələşdirilən kənd təsərrüfatı regionlarında quraqlıq, daşqın, torpaq və məhsuldarlıq volatilliyi siqnallarını AI-yə hazır risk qiymətləndirmə mühərriki ilə izləyin.",
      issueTitle: "Panel xətası",
      noticeTitle: "Qiymətləndirmə yeniləndi",
      noticeBody: "Yeni MVP iqlim riski qiymətləndirməsi yaradıldı.",
      mapTitle: "Coğrafi risk paneli",
      mapDescription: "Marker rəngləri son region risk səviyyəsini göstərir.",
      selected: "Seçilmiş",
      latestSnapshot: "Son iqlim müşahidəsi",
      selectRegionPrompt: "Ekspozisiya kontekstini görmək üçün region seçin.",
      noExplanation: "Hələ qiymətləndirmə izahı mövcud deyil.",
      loadingMap: "Coğrafi risk qatı yüklənir...",
      unableSelected: "Seçilmiş region yüklənmədi.",
      unableDashboard: "Panel məlumatları yüklənmədi.",
      unableGenerate: "Qiymətləndirmə yaratmaq mümkün olmadı.",
    },
    selector: { placeholder: "Region seçin" },
    generate: { label: "Qiymətləndirmə yarat" },
    portfolioCards: {
      totalExposure: "Ümumi ekspozisiya",
      weightedRisk: "Çəkili risk",
      regionsMonitored: "İzlənən regionlar",
      highRiskRegions: "Yüksək riskli regionlar",
      unavailable: "Portfel məlumatı mövcud deyil",
      exposureAdjusted: "Ekspozisiyaya görə çəkili bal",
      regionTypes: "Fermalar, rayonlar, portfellər",
      closerReview: "Daha yaxından baxış tələb edir",
    },
    riskScore: {
      title: "Cari risk balı",
      noAssessment: "Bu region üçün hələ qiymətləndirmə yoxdur.",
      engine: "AI-yə hazır risk qiymətləndirmə mühərriki",
      currentAssessment: "Son institusional risk qiymətləndirməsi",
      riskSuffix: "risk",
      drought: "Quraqlıq",
      flood: "Daşqın",
      soil: "Torpaq",
      yield: "Məhsul",
    },
    climate: {
      title: "İqlim göstəriciləri",
      latestDescription: "Seçilmiş coğrafiya üçün son müşahidə.",
      noSnapshot: "Bu region üçün iqlim müşahidəsi qeydə alınmayıb.",
      rainfall: "Yağıntı",
      temperature: "Temperatur",
      soilMoisture: "Torpaq rütubəti",
      vegetation: "Bitki örtüyü",
      droughtIndex: "Quraqlıq indeksi",
      floodExposure: "Daşqın ekspozisiyası",
      monthlyAccumulation: "Aylıq yığım",
      meanTemperature: "Orta temperatur",
      rootZoneEstimate: "Kök zonası təxmini",
      cropVigorSignal: "Bitki inkişaf siqnalı",
      waterStressSignal: "Su stresi siqnalı",
      surfaceWaterHazard: "Səth suları təhlükəsi",
    },
    panels: {
      financialTitle: "Maliyyə şərhi",
      financialSubtitle: "Kredit və anderraytinq konteksti",
      financialEmpty: "Hələ maliyyə şərhi mövcud deyil.",
      recommendationTitle: "Tövsiyə olunan addım",
      recommendationEmpty:
        "Tövsiyəni görmək üçün qiymətləndirmə yaradın və ya yükləyin.",
    },
    assessmentsTable: {
      title: "Son qiymətləndirmələr",
      subtitle: "Audit baxışı üçün son model nəticələri.",
      empty: "Bu region üçün qiymətləndirmə yaradılmayıb.",
      date: "Tarix",
      level: "Səviyyə",
      score: "Bal",
      drought: "Quraqlıq",
      flood: "Daşqın",
      yield: "Məhsul",
    },
    chart: {
      title: "Risk trendi",
      subtitle: "Aylıq risk və iqlim göstəriciləri",
      empty: "Bu region üçün iqlim və qiymətləndirmə tarixi yoxdur.",
      riskTab: "Risk",
      climateTab: "İqlim",
      riskScore: "Risk balı",
      rainfall: "Yağıntı mm",
      soilMoisture: "Torpaq rütubəti",
      vegetation: "Bitki örtüyü x100",
    },
    financialImpact: {
      title: "Maliyyə təsiri təxmini",
      subtitle: "Seçilmiş ekspozisiya üçün rəqəmsal case görünüşü",
      empty: "Təsir təxminlərini görmək üçün qiymətləndirməsi olan region seçin.",
      exposure: "Ekspozisiya məbləği",
      expectedLoss: "Gözlənilən iqlim itkisi",
      capitalBuffer: "Kapital buferi",
      premiumUplift: "Sığorta haqqı artımı",
      yieldRevenueAtRisk: "Risk altında məhsul gəliri",
      liquidityStress: "Likvidlik stressi",
      impactRate: "Modelləşdirilmiş təsir dərəcəsi",
      note: "MVP təxmini cari risk balı, alt-risk amilləri və portfel ekspozisiyasına əsaslanır.",
    },
    scenarioProjection: {
      title: "Ssenari proqnozu",
      subtitle: "Kredit və sığorta baxışı üçün 12 aylıq proqnoz yolları",
      empty: "Ssenari proqnozlarını görmək üçün qiymətləndirməsi olan region seçin.",
      month: "Ay",
      projectedRisk: "Proqnoz risk",
      projectedLoss: "Proqnoz itki",
      scenario: {
        base: "Baza ssenari",
        dry: "Quru mövsüm stresi",
        flood: "Daşqın şoku",
        mitigation: "Azaltma ssenarisi",
      },
      description: {
        base: "Cari risk amilləri mülayim mövsümi dəyişmə ilə davam edir.",
        dry: "Maliyyələşdirmə dövründə yağıntı çatışmazlığı və istilik stresi artır.",
        flood: "Yüksək yağıntı və doymuş torpaq sığortalı itkilərə təzyiq göstərir.",
        mitigation: "Suvarma, monitorinq və risk transferi modelləşdirilmiş təzyiqi azaldır.",
      },
    },
    workflow: {
      morningTitle: "Normal əməliyyatlar, 08:30",
      morningSubtitle:
        "Aysel üçün daxili portal SSO sessiyası, lisenziya, bildirişlər və gözləyən iqlim baxışları yüklənir.",
      sso: "SSO təsdiqləndi",
      license: "Lisenziya səviyyəsi",
      activeRisk: "Aktiv portfel riski",
      overnightAlerts: "Gecə bildirişləri",
      pendingQueue: "Gözləyən baxışlar",
      loanTitle: "Kredit baxışı prosesi, 09:00",
      loanSubtitle:
        "Karaman buğda krediti üçün məhsula həssas MVP skorlama, izah edilə bilən töhfələr, proqnozlar və kredit qərarı auditi.",
      applicationQueue: "Müraciət növbəsi",
      applicant: "Müraciətçi",
      requestedLoan: "Tələb olunan kredit",
      tenor: "Müddət",
      area: "Sahə",
      coordinates: "Koordinatlar",
      district: "Rayon",
      cropSelection: "Məhsul seçimi",
      runReview: "Risk balı yarat",
      runningReview: "3-5 saniyəlik skorlama prosesi...",
      currentRisk: "Cari risk",
      viewBreakdown: "Töhfələrə bax",
      hideBreakdown: "Töhfələri gizlət",
      factorBreakdown: "SHAP-stilli faktor bölgüsü",
      dataPipeline: "Məlumat mənbəyi siqnalları",
      projections: "Gələcək proqnozlar",
      scenario: "Ssenari",
      timeline: "Zaman xətti",
      confidenceRange: "Etibar diapazonu",
      creditRecommendation: "Kredit şərti tövsiyəsi",
      reportTitle: "Kredit riski hesabatı",
      exportReport: "Kredit riski hesabatını ixrac et",
      exportingReport: "Hesabat paketi yaradılır...",
      reportReady: "PDF-ə hazır hesabat paketi yaradıldı",
      decisionTitle: "Qərar və audit jurnalı",
      approveWithConditions: "Dəyişdirilmiş şərtlərlə təsdiqlə",
      decisionLogged: "Qərar audit üçün qeydə alındı",
      auditTrail: "Audit izi",
      modelDisclosure:
        "MVP iqlim riski qiymətləndirmə modeli. Xarici peyk, MGM və XGBoost inteqrasiyaları bu demoda AI-yə hazır konnektor nöqtələri kimi göstərilir.",
      unableLoad: "İş prosesi məlumatları yüklənmədi.",
      unableReview: "Kredit üzrə iqlim baxışı yaradıla bilmədi.",
      unableReport: "Hesabat paketi yaradıla bilmədi.",
      unableDecision: "Kredit qərarı qeydə alına bilmədi.",
    },
    portfolioMonitoring: {
      title: "Portfel monitorinqi, 14:00",
      subtitle:
        "340 aktiv kənd təsərrüfatı krediti üzrə istilik xəritəsi, gecə iqlim bildirişləri və stress-test addımları.",
      heatMapTitle: "Kredit portfeli istilik xəritəsi",
      heatMapSubtitle: "Rəngli xanalar fərdi kreditlərin iqlim riski statusunu simulyasiya edir.",
      alertTitle: "Gecə klaster bildirişi",
      affectedLoans: "Təsirlənən kreditlər",
      exposure: "Klaster ekspozisiyası",
      stressTestTitle: "2012 səviyyəli quraqlıq stress-testi",
      stressTestBody:
        "Təkrar quraqlıq stressi altında işarələnmiş Karaman klasterində defolt təzyiqi təxminən 22-29% artır.",
      forwardAlert: "Risk menecerinə göndər",
      forwarded: "Bildiriş stress-test paketi ilə göndərildi",
      unableForward: "Bildirişi göndərmək mümkün olmadı.",
    },
    regionsPage: {
      title: "Region idarəetməsi",
      subtitle:
        "İzlənən fermaları, rayonları və portfel coğrafiyalarını son iqlim və maliyyə riski siqnalları ilə nəzərdən keçirin.",
      searchPlaceholder: "Region və ya məhsul növü üzrə axtarın",
      errorTitle: "Regionlar yüklənmədi",
      tableTitle: "İzlənən coğrafiyalar",
      activeRecords: "MVP portfelində aktiv qeyd.",
      empty: "Cari axtarışa uyğun region yoxdur.",
      region: "Region",
      type: "Növ",
      crop: "Məhsul",
      area: "Sahə",
      country: "Ölkə",
      latestRisk: "Son risk",
      climateSnapshot: "İqlim müşahidəsi",
      noSnapshot: "Müşahidə yoxdur",
      unableLoad: "Regionları yükləmək mümkün olmadı.",
    },
    portfolioPage: {
      title: "Portfel risk icmalı",
      subtitle:
        "Kənd təsərrüfatı kreditləri, sığorta və dövlət zəmanəti portfelləri üçün ekspozisiya çəkili iqlim riski görünüşü.",
      issueTitle: "Portfel xətası",
      distributionTitle: "Risk bölgüsü",
      distributionSubtitle: "Son qiymətləndirməyə görə region sayı.",
      topRiskyTitle: "Ən riskli regionlar",
      topRiskySubtitle: "Son bal və ekspozisiya əhəmiyyətinə görə sıralanıb.",
      region: "Region",
      crop: "Məhsul",
      risk: "Risk",
      exposure: "Ekspozisiya",
      unableLoad: "Portfeli yükləmək mümkün olmadı.",
    },
    reportsPage: {
      eyebrow: "Bank Risk Hesabatı Yarat",
      title: "Hesabat önizləməsi",
      subtitle:
        "Kredit komitələri, anderraytinq komandaları və dövlət zəmanəti proqramları üçün çap edilə bilən institusional xülasə.",
      print: "Çap önizləməsi",
      issueTitle: "Hesabat xətası",
      reportBrand: "ClimaVex İqlim Maliyyəsi Analitikası",
      reportTitle: "Kənd Təsərrüfatı İqlim Riski Hesabatı",
      generated: "Yaradıldı",
      selectedRegion: "Seçilmiş region",
      riskLevel: "Risk səviyyəsi",
      riskScore: "Risk balı",
      scoringModel: "MVP iqlim riski qiymətləndirmə modeli",
      assessmentBasis: "Son qiymətləndirmə əsası",
      climateIndicators: "İqlim göstəriciləri",
      interpretation: "Bank tipli şərh",
      recommendation: "Tövsiyə olunan addım",
      noInterpretation: "Maliyyə şərhi yaradılmayıb.",
      noRecommendation: "Tövsiyə olunan addım yaradılmayıb.",
      selectRegion: "Hesabat önizləməsi yaratmaq üçün region seçin.",
      unavailable: "Mövcud deyil",
      unableLoad: "Hesabat məlumatları yüklənmədi.",
    },
    units: { hectares: "ha", celsius: "C" },
  },
  tr: {
    language: "Dil",
    risk: { LOW: "Düşük", MEDIUM: "Orta", HIGH: "Yüksek" },
    regionType: {
      FARM: "Çiftlik",
      DISTRICT: "Bölge",
      PORTFOLIO: "Portföy",
    },
    nav: {
      dashboard: "Panel",
      regions: "Bölgeler",
      portfolio: "Portföy",
      reports: "Raporlar",
    },
    topbar: {
      productLine: "Tarımsal finans için iklim riski analitiği",
      search: "Çiftlik, bölge veya portföy ara",
      institutionProfile: "Kurum profili",
      riskAlerts: "Risk uyarıları",
    },
    sidebar: {
      engineTitle: "MVP skorlama motoru",
      engineBody:
        "Kredi, sigorta ve kamu sektörü portföy incelemesi için AI'ye hazır iklim riski skorlama.",
    },
    dashboard: {
      eyebrow: "Türkiye tarımsal finans kapsamı",
      title: "İklim riski komuta merkezi",
      subtitle:
        "Finanse edilen tarım bölgelerinde kuraklık, sel, toprak ve verim oynaklığı sinyallerini AI'ye hazır risk skorlama motoru ile izleyin.",
      issueTitle: "Panel sorunu",
      noticeTitle: "Değerlendirme güncellendi",
      noticeBody: "Yeni bir MVP iklim riski değerlendirmesi oluşturuldu.",
      mapTitle: "Coğrafi risk paneli",
      mapDescription: "İşaret renkleri en güncel bölge risk seviyesini gösterir.",
      selected: "Seçili",
      latestSnapshot: "Son iklim gözlemi",
      selectRegionPrompt: "Maruziyet bağlamını görmek için bir bölge seçin.",
      noExplanation: "Henüz skorlama açıklaması yok.",
      loadingMap: "Coğrafi risk katmanı yükleniyor...",
      unableSelected: "Seçili bölge yüklenemedi.",
      unableDashboard: "Panel verileri yüklenemedi.",
      unableGenerate: "Değerlendirme oluşturulamadı.",
    },
    selector: { placeholder: "Bölge seçin" },
    generate: { label: "Değerlendirme oluştur" },
    portfolioCards: {
      totalExposure: "Toplam maruziyet",
      weightedRisk: "Ağırlıklı risk",
      regionsMonitored: "İzlenen bölgeler",
      highRiskRegions: "Yüksek riskli bölgeler",
      unavailable: "Portföy verisi yok",
      exposureAdjusted: "Maruziyete göre ağırlıklı skor",
      regionTypes: "Çiftlikler, ilçeler, portföyler",
      closerReview: "Daha yakın inceleme gerektirir",
    },
    riskScore: {
      title: "Güncel risk skoru",
      noAssessment: "Bu bölge için henüz değerlendirme yok.",
      engine: "AI'ye hazır risk skorlama motoru",
      currentAssessment: "Son kurumsal risk değerlendirmesi",
      riskSuffix: "risk",
      drought: "Kuraklık",
      flood: "Sel",
      soil: "Toprak",
      yield: "Verim",
    },
    climate: {
      title: "İklim göstergeleri",
      latestDescription: "Seçili coğrafya için son gözlem.",
      noSnapshot: "Bu bölge için iklim gözlemi kaydedilmemiş.",
      rainfall: "Yağış",
      temperature: "Sıcaklık",
      soilMoisture: "Toprak nemi",
      vegetation: "Bitki örtüsü",
      droughtIndex: "Kuraklık endeksi",
      floodExposure: "Sel maruziyeti",
      monthlyAccumulation: "Aylık birikim",
      meanTemperature: "Ortalama sıcaklık",
      rootZoneEstimate: "Kök bölgesi tahmini",
      cropVigorSignal: "Ürün canlılığı sinyali",
      waterStressSignal: "Su stresi sinyali",
      surfaceWaterHazard: "Yüzey suyu riski",
    },
    panels: {
      financialTitle: "Finansal yorum",
      financialSubtitle: "Kredi ve sigortalama bağlamı",
      financialEmpty: "Henüz finansal yorum yok.",
      recommendationTitle: "Önerilen aksiyon",
      recommendationEmpty:
        "Önerilen aksiyonu görmek için değerlendirme oluşturun veya yükleyin.",
    },
    assessmentsTable: {
      title: "Son değerlendirmeler",
      subtitle: "Denetim incelemesi için son model çıktıları.",
      empty: "Bu bölge için değerlendirme oluşturulmamış.",
      date: "Tarih",
      level: "Seviye",
      score: "Skor",
      drought: "Kuraklık",
      flood: "Sel",
      yield: "Verim",
    },
    chart: {
      title: "Risk trendi",
      subtitle: "Aylık risk ve iklim göstergeleri",
      empty: "Bu bölge için iklim veya değerlendirme geçmişi yok.",
      riskTab: "Risk",
      climateTab: "İklim",
      riskScore: "Risk skoru",
      rainfall: "Yağış mm",
      soilMoisture: "Toprak nemi",
      vegetation: "Bitki örtüsü x100",
    },
    financialImpact: {
      title: "Finansal etki tahmini",
      subtitle: "Seçili maruziyet için sayısal vaka görünümü",
      empty: "Etki tahminlerini görmek için değerlendirmesi olan bir bölge seçin.",
      exposure: "Maruziyet tutarı",
      expectedLoss: "Beklenen iklim kaybı",
      capitalBuffer: "Sermaye tamponu",
      premiumUplift: "Prim artışı",
      yieldRevenueAtRisk: "Risk altındaki verim geliri",
      liquidityStress: "Likidite stresi",
      impactRate: "Modellenen etki oranı",
      note: "MVP tahmini mevcut risk skoru, alt risk sürücüleri ve portföy maruziyetine dayanır.",
    },
    scenarioProjection: {
      title: "Senaryo projeksiyonu",
      subtitle: "Kredi ve sigorta incelemesi için 12 aylık tahmin yolları",
      empty: "Senaryo projeksiyonlarını görmek için değerlendirmesi olan bir bölge seçin.",
      month: "Ay",
      projectedRisk: "Öngörülen risk",
      projectedLoss: "Öngörülen kayıp",
      scenario: {
        base: "Baz senaryo",
        dry: "Kuru sezon stresi",
        flood: "Sel şoku",
        mitigation: "Azaltım senaryosu",
      },
      description: {
        base: "Mevcut risk sürücüleri sınırlı sezonluk kayma ile devam eder.",
        dry: "Finansman döngüsünde yağış açığı ve sıcaklık stresi yoğunlaşır.",
        flood: "Yüksek yağış ve doygun toprak koşulları sigortalı kayıpları artırır.",
        mitigation: "Sulama, izleme ve risk transferi modellenen baskıyı azaltır.",
      },
    },
    workflow: {
      morningTitle: "Normal operasyonlar, 08:30",
      morningSubtitle:
        "Aysel için iç portal SSO oturumu; lisans, uyarılar ve bekleyen iklim incelemeleri yüklendi.",
      sso: "SSO doğrulandı",
      license: "Lisans seviyesi",
      activeRisk: "Aktif portföy riski",
      overnightAlerts: "Gece uyarıları",
      pendingQueue: "Bekleyen incelemeler",
      loanTitle: "Kredi inceleme süreci, 09:00",
      loanSubtitle:
        "Karaman buğday kredisi için ürüne duyarlı MVP skorlama, açıklanabilir katkılar, projeksiyonlar ve kredi kararı kaydı.",
      applicationQueue: "Başvuru kuyruğu",
      applicant: "Başvuran",
      requestedLoan: "Talep edilen kredi",
      tenor: "Vade",
      area: "Alan",
      coordinates: "Koordinatlar",
      district: "İlçe",
      cropSelection: "Ürün seçimi",
      runReview: "Risk skoru üret",
      runningReview: "3-5 saniyelik skorlama akışı...",
      currentRisk: "Güncel risk",
      viewBreakdown: "Kırılıma bak",
      hideBreakdown: "Kırılımı gizle",
      factorBreakdown: "SHAP tarzı faktör kırılımı",
      dataPipeline: "Veri kaynağı sinyalleri",
      projections: "Gelecek projeksiyonları",
      scenario: "Senaryo",
      timeline: "Zaman çizelgesi",
      confidenceRange: "Güven aralığı",
      creditRecommendation: "Kredi koşulu önerisi",
      reportTitle: "Kredi riski raporu",
      exportReport: "Kredi riski raporunu dışa aktar",
      exportingReport: "Rapor paketi oluşturuluyor...",
      reportReady: "PDF'e hazır rapor paketi oluşturuldu",
      decisionTitle: "Karar ve denetim kaydı",
      approveWithConditions: "Değiştirilmiş koşullarla onayla",
      decisionLogged: "Karar denetim için kaydedildi",
      auditTrail: "Denetim izi",
      modelDisclosure:
        "MVP iklim riski skorlama modeli. Dış uydu, MGM ve XGBoost entegrasyonları bu demoda AI'ye hazır bağlayıcı noktaları olarak temsil edilir.",
      unableLoad: "İş akışı verileri yüklenemedi.",
      unableReview: "Kredi iklim incelemesi oluşturulamadı.",
      unableReport: "Rapor paketi oluşturulamadı.",
      unableDecision: "Kredi kararı kaydedilemedi.",
    },
    portfolioMonitoring: {
      title: "Portföy izleme, 14:00",
      subtitle:
        "340 aktif tarım kredisi için ısı haritası, gece iklim uyarıları ve stres testi aksiyonları.",
      heatMapTitle: "Kredi defteri ısı haritası",
      heatMapSubtitle: "Renkli hücreler bireysel kredi iklim riski durumunu simüle eder.",
      alertTitle: "Gece küme uyarısı",
      affectedLoans: "Etkilenen krediler",
      exposure: "Küme maruziyeti",
      stressTestTitle: "2012 seviyesinde kuraklık stres testi",
      stressTestBody:
        "Tekrar kuraklık stresi altında işaretlenen Karaman kümesinde tahmini temerrüt baskısı %22-29 artar.",
      forwardAlert: "Risk yöneticisine ilet",
      forwarded: "Uyarı stres testi paketiyle iletildi",
      unableForward: "Uyarı iletilemedi.",
    },
    regionsPage: {
      title: "Bölge yönetimi",
      subtitle:
        "İzlenen çiftlikleri, ilçeleri ve portföy coğrafyalarını en son iklim ve finansal risk sinyalleriyle inceleyin.",
      searchPlaceholder: "Bölge veya ürün türü ara",
      errorTitle: "Bölgeler yüklenemedi",
      tableTitle: "İzlenen coğrafyalar",
      activeRecords: "MVP portföyünde aktif kayıt.",
      empty: "Geçerli aramayla eşleşen bölge yok.",
      region: "Bölge",
      type: "Tür",
      crop: "Ürün",
      area: "Alan",
      country: "Ülke",
      latestRisk: "Son risk",
      climateSnapshot: "İklim gözlemi",
      noSnapshot: "Gözlem yok",
      unableLoad: "Bölgeler yüklenemedi.",
    },
    portfolioPage: {
      title: "Portföy risk özeti",
      subtitle:
        "Tarımsal kredi, sigorta ve kamu garanti portföyleri için maruziyet ağırlıklı iklim riski görünümü.",
      issueTitle: "Portföy sorunu",
      distributionTitle: "Risk dağılımı",
      distributionSubtitle: "Son değerlendirmeye göre bölge sayısı.",
      topRiskyTitle: "En riskli bölgeler",
      topRiskySubtitle: "Son skor ve maruziyet önemine göre sıralandı.",
      region: "Bölge",
      crop: "Ürün",
      risk: "Risk",
      exposure: "Maruziyet",
      unableLoad: "Portföy yüklenemedi.",
    },
    reportsPage: {
      eyebrow: "Banka Risk Raporu Oluştur",
      title: "Rapor önizlemesi",
      subtitle:
        "Kredi komiteleri, sigortalama ekipleri ve kamu garanti programları için yazdırılabilir kurumsal özet.",
      print: "Yazdırma önizlemesi",
      issueTitle: "Rapor sorunu",
      reportBrand: "ClimaVex İklim Finansmanı Analitiği",
      reportTitle: "Tarımsal İklim Riski Raporu",
      generated: "Oluşturuldu",
      selectedRegion: "Seçili bölge",
      riskLevel: "Risk seviyesi",
      riskScore: "Risk skoru",
      scoringModel: "MVP iklim riski skorlama modeli",
      assessmentBasis: "Son değerlendirme temeli",
      climateIndicators: "İklim göstergeleri",
      interpretation: "Banka tipi yorum",
      recommendation: "Önerilen aksiyon",
      noInterpretation: "Finansal yorum oluşturulmadı.",
      noRecommendation: "Önerilen aksiyon oluşturulmadı.",
      selectRegion: "Rapor önizlemesi oluşturmak için bir bölge seçin.",
      unavailable: "Yok",
      unableLoad: "Rapor verileri yüklenemedi.",
    },
    units: { hectares: "ha", celsius: "C" },
  },
};
