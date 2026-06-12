/**
 * Config.gs
 * Configuration constants for the GAS backend
 */

const CONFIG = {
  // ⚠️ USER MUST REPLACE THIS WITH THEIR ACTUAL SPREADSHEET ID AFTER CREATING ONE
  // OR IF LEFT EMPTY, IT WILL TRY TO USE SpreadsheetApp.getActiveSpreadsheet().getId()
  SPREADSHEET_ID: "1da3ffWpA-cF18UqMIA3UZ8owGBjo_p5FC_Bfu48KTjQ", 
  
  CACHE_TTL: 300, // 5 minutes cache TTL
  
  SHEETS: {
    TRAININGS: "Trainings",
    SESSIONS: "Sessions",
    PARTICIPANTS: "Participants",
    REGISTRATIONS: "Registrations",
    PRE_TESTS: "PreTests",
    POST_TESTS: "PostTests",
    QUESTIONS: "Questions",
    ANSWERS: "Answers",
    SATISFACTION_FORMS: "SatisfactionForms",
    SATISFACTION_RESPONSES: "SatisfactionResponses",
    ANALYTICS: "Analytics",
    CONFIG: "Config"
  }
};
