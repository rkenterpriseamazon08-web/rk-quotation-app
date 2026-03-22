const SHEET_ID = "1ifmLfBhwLHe5Il84qjBI-aGG7wPfwWBFLDN4QWyPk70";
const SHEET_NAME = "Sheet1";
const QUOTE_PREFIX = "RKQ-260319-1";
const START_SEQUENCE = 55753;
const TEMPLATE_DOC_ID = "197umlq1ax_ykGIhYNO-Z4dqBkFMWdpt5BC_oFmvXsig";
const PDF_FOLDER_ID = "15aa-2CDF1vVtw4r11RPUPqxZNkISKHVW";

const HEADERS = [
  "quotationNumber",
  "quotationDate",
  "clientName",
  "companyName",
  "companyGST",
  "address",
  "projectLocation",
  "pinCode",
  "contactNumber",
  "email",
  "notes",
  "containerLength",
  "containerWidth",
  "containerHeight",
  "priceBeforeGst",
  "distanceToSite",
  "partitions",
  "doors",
  "windows",
  "bunkBed",
  "workstation",
  "acProvision",
  "toiletUnit",
  "insulation",
  "glassDoor",
  "aluminiumWindow",
  "falseCeiling",
  "managerialTable",
  "conferenceTable",
  "overheadFileCabinet",
  "epoxyFlooring",
  "floorArea",
  "calculatedCost",
  "epoxyFlooringAmount",
  "gst",
  "finalQuotedPrice",
  "pdfFileUrl",
  "pdfStatus"
];

function doGet(e) {
  try {
    const action = (e.parameter.action || "").trim();
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);

    if (!sheet) {
      return jsonResponse({ success: false, error: "Sheet not found" });
    }

    ensureHeaders(sheet);

    if (action === "getClients") {
      const records = getAllRecords(sheet);
      const clients = [...new Set(
        records.map(function (r) {
          return String(r.clientName || "").trim();
        }).filter(Boolean)
      )].sort();

      return jsonResponse({ success: true, clients: clients });
    }

    if (action === "getProjects") {
      const clientName = String(e.parameter.clientName || "").trim();

      const records = getAllRecords(sheet).filter(function (r) {
        return String(r.clientName || "").trim() === clientName;
      });

      const projects = [...new Set(
        records.map(function (r) {
          return String(r.address || r.projectLocation || "").trim();
        }).filter(Boolean)
      )].sort();

      return jsonResponse({ success: true, projects: projects });
    }

    if (action === "searchCustomer") {
      const clientName = String(e.parameter.clientName || "").trim();
      const projectLocation = String(e.parameter.projectLocation || "").trim();

      const records = getAllRecords(sheet).filter(function (r) {
        const savedAddress = String(r.address || r.projectLocation || "").trim();
        return (
          String(r.clientName || "").trim() === clientName &&
          savedAddress === projectLocation
        );
      });

      return jsonResponse({ success: true, records: records });
    }

    if (action === "generateQuotationPdf") {
      const quotationNumber = String(e.parameter.quotationNumber || "").trim();

      if (!quotationNumber) {
        return jsonResponse({ success: false, error: "quotationNumber is required" });
      }

      const result = generateQuotationPdf(sheet, quotationNumber);

      return jsonResponse({
        success: true,
        pdfUrl: result.pdfUrl,
        pdfFileId: result.pdfFileId
      });
    }

    return jsonResponse({ success: false, error: "Invalid action" });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

function doPost(e) {
  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);

    try {
      const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
      if (!sheet) {
        throw new Error("Sheet not found");
      }

      const headers = ensureHeaders(sheet);
      const data = normalizeIncomingData(JSON.parse(e.postData.contents || "{}"));
      const quotationNumber = generateNextQuoteNumber(sheet);

      data.quotationNumber = quotationNumber;

      const rowValues = headers.map(function (header) {
        return data.hasOwnProperty(header) ? data[header] : "";
      });

      sheet.appendRow(rowValues);

      return jsonResponse({
        success: true,
        quotationNumber: quotationNumber,
        message: "Data saved successfully"
      });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

function ensureHeaders(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const existingHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const cleanedHeaders = existingHeaders.map(function (header) {
    return String(header || "").trim();
  });

  const isHeaderRowEmpty = cleanedHeaders.every(function (header) {
    return !header;
  });

  if (isHeaderRowEmpty) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return HEADERS.slice();
  }

  const headerSet = {};
  cleanedHeaders.forEach(function (header) {
    if (header) {
      headerSet[header] = true;
    }
  });

  const missingHeaders = HEADERS.filter(function (header) {
    return !headerSet[header];
  });

  if (missingHeaders.length) {
    sheet.getRange(1, cleanedHeaders.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
  }

  const finalLastColumn = Math.max(sheet.getLastColumn(), HEADERS.length);
  return sheet.getRange(1, 1, 1, finalLastColumn).getValues()[0].map(function (header) {
    return String(header || "").trim();
  });
}

function normalizeIncomingData(data) {
  const normalized = Object.assign({}, data || {});

  normalized.address = normalized.address || normalized.projectLocation || "";
  normalized.projectLocation = normalized.projectLocation || normalized.address || "";

  normalized.companyGST = normalized.companyGST || "";
  normalized.pinCode = normalized.pinCode || "";
  normalized.bunkBed = normalized.bunkBed || 0;
  normalized.workstation = normalized.workstation || 0;
  normalized.managerialTable = normalized.managerialTable || "No";
  normalized.conferenceTable = normalized.conferenceTable || "No";
  normalized.overheadFileCabinet = normalized.overheadFileCabinet || "No";
  normalized.epoxyFlooring = normalized.epoxyFlooring || "No";
  normalized.floorArea = normalized.floorArea || 0;
  normalized.calculatedCost = normalized.calculatedCost || 0;
  normalized.epoxyFlooringAmount = normalized.epoxyFlooringAmount || 0;
  normalized.gst = normalized.gst || 0;
  normalized.finalQuotedPrice = normalized.finalQuotedPrice || 0;
  normalized.pdfFileUrl = normalized.pdfFileUrl || "";
  normalized.pdfStatus = normalized.pdfStatus || "";

  return normalized;
}

function generateNextQuoteNumber(sheet) {
  const lastRow = sheet.getLastRow();
  let nextSequence = START_SEQUENCE;

  if (lastRow > 1) {
    const lastQuote = sheet.getRange(lastRow, 1).getValue();
    const lastQuoteStr = String(lastQuote || "").trim();
    const match = lastQuoteStr.match(/(\d{5})$/);

    if (match) {
      nextSequence = Number(match[1]) + 1;
    }
  }

  return QUOTE_PREFIX + String(nextSequence).padStart(5, "0");
}

function generateQuotationPdf(sheet, quotationNumber) {
  Logger.log("Entered generateQuotationPdf");

  ensureHeaders(sheet);

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    throw new Error("No data found in sheet");
  }

  const headers = values[0];
  const headerMap = {};
  headers.forEach(function (header, index) {
    headerMap[String(header).trim()] = index + 1;
  });

  let rowIndex = -1;
  let rowObject = null;

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const currentQuote = String(row[0] || "").trim();

    if (currentQuote === String(quotationNumber).trim()) {
      rowIndex = i + 1;
      rowObject = {};

      headers.forEach(function (header, index) {
        let value = row[index];
        if (value instanceof Date) {
          value = Utilities.formatDate(value, Session.getScriptTimeZone(), "dd-MM-yyyy");
        }
        rowObject[String(header).trim()] = value;
      });

      break;
    }
  }

  if (!rowObject) {
    throw new Error("Quotation not found in sheet for: " + quotationNumber);
  }

  rowObject.address = rowObject.address || rowObject.projectLocation || "";
  rowObject.projectLocation = rowObject.projectLocation || rowObject.address || "";

  Logger.log("Found row: " + JSON.stringify(rowObject));

  if (headerMap.pdfFileUrl) {
    const existingPdfUrl = sheet.getRange(rowIndex, headerMap.pdfFileUrl).getValue();
    if (existingPdfUrl) {
      Logger.log("Existing PDF found, returning old URL");
      return {
        pdfUrl: existingPdfUrl,
        pdfFileId: ""
      };
    }
  }

  let templateFile, pdfFolder;
  try {
    templateFile = DriveApp.getFileById(TEMPLATE_DOC_ID);
  } catch (err) {
    throw new Error("Invalid TEMPLATE_DOC_ID or no access to template document");
  }

  try {
    pdfFolder = DriveApp.getFolderById(PDF_FOLDER_ID);
  } catch (err) {
    throw new Error("Invalid PDF_FOLDER_ID or no access to folder");
  }

  const fileBaseName =
    "Quotation_" + rowObject.quotationNumber + "_" + (rowObject.clientName || "Client");

  Logger.log("Creating temp doc copy...");
  const tempDocFile = templateFile.makeCopy(fileBaseName, pdfFolder);

  Logger.log("Opening temp doc...");
  const doc = DocumentApp.openById(tempDocFile.getId());
  const body = doc.getBody();

  Logger.log("Replacing placeholders...");
  Object.keys(rowObject).forEach(function (key) {
    const value =
      rowObject[key] !== null && rowObject[key] !== undefined
        ? String(rowObject[key])
        : "";
    body.replaceText("{{" + key + "}}", value);
  });

  doc.saveAndClose();

  Logger.log("Creating PDF...");
  const pdfBlob = tempDocFile.getAs(MimeType.PDF).setName(fileBaseName + ".pdf");
  const pdfFile = pdfFolder.createFile(pdfBlob);

  Logger.log("Deleting temp doc...");
  tempDocFile.setTrashed(true);

  if (headerMap.pdfFileUrl) {
    sheet.getRange(rowIndex, headerMap.pdfFileUrl).setValue(pdfFile.getUrl());
  }

  if (headerMap.pdfStatus) {
    sheet.getRange(rowIndex, headerMap.pdfStatus).setValue("Generated");
  }

  Logger.log("PDF generation complete");

  return {
    pdfUrl: pdfFile.getUrl(),
    pdfFileId: pdfFile.getId()
  };
}

function testGenerateQuotationPdf() {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const quotationNumber = "RKQ-260319-155754";

    Logger.log("Test started");
    Logger.log("Sheet name: " + sheet.getName());
    Logger.log("Quotation number: " + quotationNumber);
    Logger.log("Template Doc ID: " + TEMPLATE_DOC_ID);
    Logger.log("PDF Folder ID: " + PDF_FOLDER_ID);

    const result = generateQuotationPdf(sheet, quotationNumber);

    Logger.log("Result: " + JSON.stringify(result));
  } catch (error) {
    Logger.log("Test failed: " + error.toString());
    throw error;
  }
}

function getAllRecords(sheet) {
  ensureHeaders(sheet);

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  const rows = values.slice(1);

  return rows.map(function (row) {
    const obj = {};
    headers.forEach(function (header, index) {
      let value = row[index];
      if (value instanceof Date) {
        value = Utilities.formatDate(value, Session.getScriptTimeZone(), "dd-MM-yyyy");
      }
      obj[String(header).trim()] = value;
    });

    obj.address = obj.address || obj.projectLocation || "";
    obj.projectLocation = obj.projectLocation || obj.address || "";

    return obj;
  });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function testTemplateAccess() {
  const file = DriveApp.getFileById(TEMPLATE_DOC_ID);
  Logger.log("Template name: " + file.getName());
  Logger.log("Template mime type: " + file.getMimeType());
}

function testTemplateDocAccess() {
  const doc = DocumentApp.openById(TEMPLATE_DOC_ID);
  Logger.log("Doc name: " + doc.getName());
}
