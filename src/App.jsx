import React, { useMemo, useState } from "react";
import "./App.css";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby_DAm-gBeM3xrh4feR8fKVHnm5HzIhOTAEz05pzUXpEAld7ic0ay4l8irDzliczXHsHw/exec";

const GST_PERCENT = 18;

const initialForm = {
  quotationNumber: "",
  quotationDate: new Date().toISOString().split("T")[0],
  clientName: "",
  companyName: "",
  companyGST: "",
  projectLocation: "",
  pinCode: "",
  contactNumber: "",
  email: "",
  notes: "",
  containerLength: 40,
  containerWidth: 10,
  containerHeight: 10,
  priceBeforeGst: 100000,
  distanceToSite: 500,
  partitions: 1,
  doors: 1,
  windows: 2,
  bed: 0,
  bunkBed: 0,
  workstation: 0,
  acProvision: true,
  toiletUnit: true,
  insulation: true,
  glassDoor: false,
  aluminiumWindow: true,
  falseCeiling: false,
  managerialTable: false,
  conferenceTable: false,
  overheadFileCabinet: false,
  epoxyFlooring: false,
};

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function buildPayload(form, calculations) {
  return {
    quotationNumber: form.quotationNumber,
    quotationDate: form.quotationDate,
    clientName: form.clientName,
    companyName: form.companyName,
    companyGST: form.companyGST,
    address: form.projectLocation,
    pinCode: form.pinCode,
    contactNumber: form.contactNumber,
    email: form.email,
    notes: form.notes,
    containerLength: safeNumber(form.containerLength),
    containerWidth: safeNumber(form.containerWidth),
    containerHeight: safeNumber(form.containerHeight),
    priceBeforeGst: safeNumber(form.priceBeforeGst),
    distanceToSite: safeNumber(form.distanceToSite),
    partitions: safeNumber(form.partitions),
    doors: safeNumber(form.doors),
    windows: safeNumber(form.windows),
    bed: safeNumber(form.bed),
    bunkBed: safeNumber(form.bunkBed),
    workstation: safeNumber(form.workstation),
    acProvision: form.acProvision ? "Yes" : "No",
    toiletUnit: form.toiletUnit ? "Yes" : "No",
    insulation: form.insulation ? "Yes" : "No",
    glassDoor: form.glassDoor ? "Yes" : "No",
    falseCeiling: form.falseCeiling ? "Yes" : "No",
    managerialTable: form.managerialTable ? "Yes" : "No",
    conferenceTable: form.conferenceTable ? "Yes" : "No",
    overheadFileCabinet: form.overheadFileCabinet ? "Yes" : "No",
    epoxyFlooring: form.epoxyFlooring ? "Yes" : "No",
    calculatedCost: Math.round(calculations.calculatedCost),
    enteredPriceBeforeGst: safeNumber(form.priceBeforeGst),
    bedCost: Math.round(calculations.bedCost),
    bunkBedCost: Math.round(calculations.bunkBedCost),
    workstationCost: Math.round(calculations.workstationCost),
    epoxyFlooringCost: Math.round(calculations.epoxyFlooringCost),
    gst18Percent: Math.round(calculations.gst),
    finalPrice: Math.round(calculations.finalPrice),
  };
}

function Field({ label, value, onChange, type = "text", readOnly = false }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input
        className="input"
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) =>
          onChange(type === "number" ? safeNumber(e.target.value) : e.target.value)
        }
      />
    </div>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="toggle-card">
      <span className="toggle-label">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function DetailBox({ label, value }) {
  return (
    <div className="detail-box">
      <div className="detail-label">{label}</div>
      <div className="detail-value">{value || "—"}</div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("quotation");
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const [clientOptions, setClientOptions] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);
  const [searchClient, setSearchClient] = useState("");
  const [searchProject, setSearchProject] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [clientsLoaded, setClientsLoaded] = useState(false);

  const calculations = useMemo(() => {
    const area =
      safeNumber(form.containerLength || 0) * safeNumber(form.containerWidth || 0);

    const steelCost = area * 190;
    const sheetMetalCost = area * 231;
    const flooringCost = area * 90;
    const electricalCost = area * 100;
    const paintingCost = area * 60;
    const doorCost = safeNumber(form.doors || 0) * 6000;
    const windowCost = safeNumber(form.windows || 0) * 3500;
    const partitionCost = safeNumber(form.partitions || 0) * 10000;
    const laborCost = area * 100;
    const transportCost = safeNumber(form.distanceToSite || 0) * 120;
    const toiletCost = form.toiletUnit ? 20000 : 0;
    const insulationCost = form.insulation ? area * 155 : 0;
    const glassDoorCost = form.glassDoor ? 12000 : 0;
    const aluminiumWindowCost = 0;
    const falseCeilingCost = form.falseCeiling ? area * 110 : 0;

    const bedCost = safeNumber(form.bed || 0) * 3500;
    const bunkBedCost = safeNumber(form.bunkBed || 0) * 9000;
    const workstationCost = safeNumber(form.workstation || 0) * 4000;
    const managerialTableCost = form.managerialTable ? 7000 : 0;
    const conferenceTableCost = form.conferenceTable ? 12000 : 0;
    const overheadFileCabinetCost = form.overheadFileCabinet ? 4000 : 0;
    const epoxyFlooringCost = form.epoxyFlooring ? area * 80 : 0;

    const calculatedCost =
      steelCost +
      sheetMetalCost +
      flooringCost +
      electricalCost +
      paintingCost +
      doorCost +
      windowCost +
      partitionCost +
      laborCost +
      transportCost +
      toiletCost +
      insulationCost +
      glassDoorCost +
      aluminiumWindowCost +
      falseCeilingCost +
      bedCost +
      bunkBedCost +
      workstationCost +
      managerialTableCost +
      conferenceTableCost +
      overheadFileCabinetCost +
      epoxyFlooringCost;

    const gst = safeNumber(form.priceBeforeGst || 0) * (GST_PERCENT / 100);
    const finalPrice = safeNumber(form.priceBeforeGst || 0) + gst;

    return {
      area,
      steelCost,
      sheetMetalCost,
      flooringCost,
      electricalCost,
      paintingCost,
      doorCost,
      windowCost,
      partitionCost,
      laborCost,
      transportCost,
      toiletCost,
      insulationCost,
      glassDoorCost,
      aluminiumWindowCost,
      falseCeilingCost,
      bedCost,
      bunkBedCost,
      workstationCost,
      managerialTableCost,
      conferenceTableCost,
      overheadFileCabinetCost,
      epoxyFlooringCost,
      calculatedCost,
      gst,
      finalPrice,
    };
  }, [form]);

  const payload = useMemo(() => buildPayload(form, calculations), [form, calculations]);

  const resetForm = () => {
    setForm({
      ...initialForm,
      quotationNumber: "",
      quotationDate: new Date().toISOString().split("T")[0],
    });
    setStatus("Form reset.");
  };

  const saveToGoogleSheet = async () => {
    if (!form.clientName || !form.projectLocation) {
      setStatus("Please fill client name and address before saving.");
      return;
    }

    try {
      setSaving(true);
      setStatus("Saving quotation details and generating quotation number...");

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to save");
      }

      setForm((prev) => ({
        ...prev,
        quotationNumber: result.quotationNumber || "",
      }));

      setStatus(
        `Quotation saved successfully.${
          result.quotationNumber ? ` Generated quotation number: ${result.quotationNumber}` : ""
        }`
      );
    } catch (error) {
      setStatus(`Could not save to Google Sheet. ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const generateQuotationPdf = async () => {
    if (!form.quotationNumber) {
      setStatus("Please save the quotation first before generating PDF.");
      return;
    }

    try {
      setPdfGenerating(true);
      setStatus("Generating quotation PDF...");

      const response = await fetch(
        `${APPS_SCRIPT_URL}?action=generateQuotationPdf&quotationNumber=${encodeURIComponent(
          form.quotationNumber
        )}`
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to generate PDF");
      }

      setStatus("Quotation PDF generated successfully.");
      window.open(result.pdfUrl, "_blank");
    } catch (error) {
      setStatus(`Could not generate quotation PDF. ${error.message}`);
    } finally {
      setPdfGenerating(false);
    }
  };

  const fetchClients = async () => {
    try {
      setSearchLoading(true);
      setSearchStatus("Loading client names...");

      const response = await fetch(`${APPS_SCRIPT_URL}?action=getClients`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to load clients");
      }

      setClientOptions(result.clients || []);
      setClientsLoaded(true);
      setSearchStatus("");
    } catch (error) {
      setSearchStatus(`Could not load clients. ${error.message}`);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchProjects = async (clientName) => {
    try {
      setSearchStatus("Loading addresses...");

      const response = await fetch(
        `${APPS_SCRIPT_URL}?action=getProjects&clientName=${encodeURIComponent(clientName)}`
      );
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to load addresses");
      }

      setProjectOptions(result.projects || []);
      setSearchStatus("");
    } catch (error) {
      setProjectOptions([]);
      setSearchStatus(`Could not load addresses. ${error.message}`);
    }
  };

  const handleClientChange = async (clientName) => {
    setSearchClient(clientName);
    setSearchProject("");
    setSearchResults([]);

    if (clientName) {
      await fetchProjects(clientName);
    } else {
      setProjectOptions([]);
    }
  };

  const handleSearch = async () => {
    if (!searchClient || !searchProject) {
      setSearchStatus("Please select client name and address.");
      return;
    }

    try {
      setSearchLoading(true);
      setSearchStatus("Searching customer details...");

      const response = await fetch(
        `${APPS_SCRIPT_URL}?action=searchCustomer&clientName=${encodeURIComponent(
          searchClient
        )}&projectLocation=${encodeURIComponent(searchProject)}`
      );
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Search failed");
      }

      setSearchResults(result.records || []);
      setSearchStatus((result.records || []).length ? "" : "No matching records found.");
    } catch (error) {
      setSearchResults([]);
      setSearchStatus(`Could not search records. ${error.message}`);
    } finally {
      setSearchLoading(false);
    }
  };

  if (page === "search") {
    return (
      <div className="app-shell">
        <div className="page-wrap">
          <section className="hero-card">
            <div className="hero-content">
              <div>
                <div className="hero-badge">Customer Search</div>
                <h1 className="hero-title">Customer Search</h1>
                <p className="hero-subtitle">
                  Search saved quotations by client name and address.
                </p>
              </div>
              <button className="btn btn-secondary" onClick={() => setPage("quotation")}>
                Back to Quotation
              </button>
            </div>
          </section>

          <section className="card">
            <div className="section-header">
              <h2>Search Filters</h2>
            </div>

            <div className="search-grid">
              <div className="field field-bottom">
                <button
                  className="btn btn-primary full-btn"
                  onClick={fetchClients}
                  disabled={searchLoading}
                >
                  {searchLoading && !clientsLoaded ? "Loading..." : "Load Clients"}
                </button>
              </div>

              <div className="field">
                <label className="field-label">Client Name</label>
                <select
                  className="input"
                  value={searchClient}
                  disabled={!clientsLoaded}
                  onChange={(e) => handleClientChange(e.target.value)}
                >
                  <option value="">
                    {clientsLoaded ? "Select client" : "Click Load Clients first"}
                  </option>
                  {clientOptions.map((client) => (
                    <option key={client} value={client}>
                      {client}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field-label">Address</label>
                <select
                  className="input"
                  value={searchProject}
                  disabled={!searchClient || !clientsLoaded}
                  onChange={(e) => setSearchProject(e.target.value)}
                >
                  <option value="">
                    {searchClient ? "Select address" : "Select client first"}
                  </option>
                  {projectOptions.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field field-bottom">
                <button
                  className="btn btn-primary full-btn"
                  onClick={handleSearch}
                  disabled={searchLoading}
                >
                  {searchLoading ? "Searching..." : "Search"}
                </button>
              </div>
            </div>

            {searchStatus ? <div className="status-box">{searchStatus}</div> : null}
          </section>

          <div className="results-stack">
            {searchResults.map((record, index) => (
              <section className="card" key={`${record.quotationNumber || "record"}-${index}`}>
                <div className="record-header">
                  <div>
                    <h2 className="record-title">{record.clientName || "Customer Record"}</h2>
                    <div className="record-subtitle">
                      {record.address || record.projectLocation || "—"}
                    </div>
                  </div>
                  <div className="quote-pill">
                    <span className="quote-pill-label">Quotation Number</span>
                    <strong>{record.quotationNumber || "—"}</strong>
                  </div>
                </div>

                <div className="details-grid">
                  <DetailBox label="Quotation Date" value={record.quotationDate} />
                  <DetailBox label="Client Name" value={record.clientName} />
                  <DetailBox label="Company Name" value={record.companyName} />
                  <DetailBox label="Company GST" value={record.companyGST} />
                  <DetailBox label="Address" value={record.address || record.projectLocation} />
                  <DetailBox label="Pin Code" value={record.pinCode} />
                  <DetailBox label="Contact Number" value={record.contactNumber} />
                  <DetailBox label="Email" value={record.email} />
                  <DetailBox
                    label="Container Size"
                    value={`${record.containerLength || "—"} x ${record.containerWidth || "—"} x ${
                      record.containerHeight || "—"
                    } ft`}
                  />
                  <DetailBox
                    label="Calculated Cost"
                    value={record.calculatedCost ? formatINR(record.calculatedCost) : "—"}
                  />
                  <DetailBox
                    label="Final Quoted Price"
                    value={record.finalQuotedPrice ? formatINR(record.finalQuotedPrice) : "—"}
                  />
                  <DetailBox
                    label="Distance to Site"
                    value={record.distanceToSite ? `${record.distanceToSite} km` : "—"}
                  />
                  <DetailBox label="Partitions" value={record.partitions} />
                  <DetailBox label="Doors" value={record.doors} />
                  <DetailBox label="Windows" value={record.windows} />
                  <DetailBox label="Bed" value={record.bed} />
                  <DetailBox label="Bunk Bed (Twin Sharing)" value={record.bunkBed} />
                  <DetailBox label="Workstation" value={record.workstation} />
                  <DetailBox label="AC Provision" value={record.acProvision} />
                  <DetailBox label="Toilet Unit" value={record.toiletUnit} />
                  <DetailBox label="Insulation" value={record.insulation} />
                  <DetailBox label="Glass Door" value={record.glassDoor} />
                  <DetailBox label="Urinal" value={record.aluminiumWindow} />
                  <DetailBox label="False Ceiling" value={record.falseCeiling} />
                  <DetailBox label="Managerial Table" value={record.managerialTable} />
                  <DetailBox label="Conference Table" value={record.conferenceTable} />
                  <DetailBox
                    label="Overhead File Cabinet"
                    value={record.overheadFileCabinet}
                  />
                  <DetailBox label="Epoxy Flooring" value={record.epoxyFlooring} />
                  <DetailBox
                    label="Epoxy Flooring Amount"
                    value={
                      record.epoxyFlooringAmount
                        ? formatINR(record.epoxyFlooringAmount)
                        : "—"
                    }
                  />
                </div>

                <div className="notes-card">
                  <div className="notes-title">Notes</div>
                  <div>{record.notes || "—"}</div>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="page-wrap">
        <section className="hero-card">
          <div className="hero-content">
          <div>
  <div className="hero-badge">Quotation Automation</div>
  <h1 className="hero-title">R.K. Enterprise Quotation Automation App</h1>
  <p className="hero-subtitle">
    Generate container quotations and save them to Google Sheets.
  </p>
</div>

           <div className="hero-side">
  <div className="quote-summary">
    <div className="summary-row">
      <span>Quotation No.</span>
      <strong>
        {form.quotationNumber ? form.quotationNumber : "Shown after save"}
      </strong>
    </div>
    <div className="summary-row">
      <span>Quotation Date</span>
      <strong>{form.quotationDate || "—"}</strong>
    </div>
  </div>

  <button className="btn btn-secondary full-btn" onClick={() => setPage("search")}>
    Customer Search
  </button>
</div>
          </div>
        </section>

        <div className="main-grid">
          <section className="card">
            <div className="section-header">
              <h2>Quotation Inputs</h2>
              <button className="btn btn-secondary" onClick={resetForm}>
                Reset
              </button>
            </div>

            <div className="form-grid two-col">
              <Field
                label="Client Name"
                value={form.clientName}
                onChange={(v) => setForm({ ...form, clientName: v })}
              />
              <Field
                label="Company Name"
                value={form.companyName}
                onChange={(v) => setForm({ ...form, companyName: v })}
              />
              <Field
                label="Company GST"
                value={form.companyGST}
                onChange={(v) => setForm({ ...form, companyGST: v })}
              />
              <Field
                label="Address"
                value={form.projectLocation}
                onChange={(v) => setForm({ ...form, projectLocation: v })}
              />
              <Field
                label="Pin Code"
                value={form.pinCode}
                onChange={(v) => setForm({ ...form, pinCode: v })}
              />
              <Field
                label="Contact Number"
                value={form.contactNumber}
                onChange={(v) => setForm({ ...form, contactNumber: v })}
              />
              <Field
                label="Email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <Field
                label="Quotation Date"
                type="date"
                value={form.quotationDate}
                onChange={(v) => setForm({ ...form, quotationDate: v })}
              />
            </div>

            <div className="divider" />

            <h3 className="subsection-title">Container Configuration</h3>
            <div className="form-grid three-col">
              <div className="field">
                <label className="field-label">Container Length (ft)</label>
                <select
                  className="input"
                  value={form.containerLength}
                  onChange={(e) =>
                    setForm({ ...form, containerLength: safeNumber(e.target.value) })
                  }
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={40}>40</option>
                </select>
              </div>

              <Field
                label="Container Width (ft)"
                type="number"
                value={10}
                onChange={() => {}}
                readOnly
              />
              <Field
                label="Container Height (ft)"
                type="number"
                value={10}
                onChange={() => {}}
                readOnly
              />
              <Field
                label="Price Before GST"
                type="number"
                value={form.priceBeforeGst}
                onChange={(v) => setForm({ ...form, priceBeforeGst: v })}
              />
              <Field
                label="Distance to Site (km)"
                type="number"
                value={form.distanceToSite}
                onChange={(v) => setForm({ ...form, distanceToSite: v })}
              />
              <Field
                label="Partitions"
                type="number"
                value={form.partitions}
                onChange={(v) => setForm({ ...form, partitions: v })}
              />
              <Field
                label="Doors"
                type="number"
                value={form.doors}
                onChange={(v) => setForm({ ...form, doors: v })}
              />
              <Field
                label="Windows"
                type="number"
                value={form.windows}
                onChange={(v) => setForm({ ...form, windows: v })}
              />
              <Field
                label="Bed"
                type="number"
                value={form.bed}
                onChange={(v) => setForm({ ...form, bed: v })}
              />
              <Field
                label="Bunk Bed (Twin Sharing)"
                type="number"
                value={form.bunkBed}
                onChange={(v) => setForm({ ...form, bunkBed: v })}
              />
              <Field
                label="Workstation"
                type="number"
                value={form.workstation}
                onChange={(v) => setForm({ ...form, workstation: v })}
              />
            </div>

            <div className="divider" />

            <h3 className="subsection-title">Optional Features</h3>
            <div className="toggle-grid">
              <ToggleField
                label="AC Provision"
                checked={form.acProvision}
                onChange={(v) => setForm({ ...form, acProvision: v })}
              />
              <ToggleField
                label="Toilet Unit"
                checked={form.toiletUnit}
                onChange={(v) => setForm({ ...form, toiletUnit: v })}
              />
              <ToggleField
                label="Insulation"
                checked={form.insulation}
                onChange={(v) => setForm({ ...form, insulation: v })}
              />
              <ToggleField
                label="Glass Door"
                checked={form.glassDoor}
                onChange={(v) => setForm({ ...form, glassDoor: v })}
              />
              <ToggleField
                label="False Ceiling"
                checked={form.falseCeiling}
                onChange={(v) => setForm({ ...form, falseCeiling: v })}
              />
              <ToggleField
                label="Managerial Table"
                checked={form.managerialTable}
                onChange={(v) => setForm({ ...form, managerialTable: v })}
              />
              <ToggleField
                label="Conference Table"
                checked={form.conferenceTable}
                onChange={(v) => setForm({ ...form, conferenceTable: v })}
              />
              <ToggleField
                label="Overhead File Cabinet"
                checked={form.overheadFileCabinet}
                onChange={(v) => setForm({ ...form, overheadFileCabinet: v })}
              />
              <ToggleField
                label="Epoxy Flooring"
                checked={form.epoxyFlooring}
                onChange={(v) => setForm({ ...form, epoxyFlooring: v })}
              />
            </div>

            <div className="field notes-field">
              <label className="field-label">Notes</label>
              <textarea
                className="textarea"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={5}
              />
            </div>
          </section>

          <section className="card preview-card">
            <h2 className="preview-title">Quotation Preview</h2>

            <div className="preview-grid">
              <DetailBox label="Client" value={form.clientName || "—"} />
              <DetailBox label="Address" value={form.projectLocation || "—"} />
              <DetailBox label="Container Size" value={`${form.containerLength} x 10 x 10 ft`} />
              <DetailBox label="Floor Area" value={`${calculations.area} sqft`} />
              <DetailBox label="Calculated Cost" value={formatINR(calculations.calculatedCost)} />
              <DetailBox label="GST" value={formatINR(calculations.gst)} />
              <DetailBox label="Final Quote" value={formatINR(calculations.finalPrice)} />
            </div>

            <div className="price-card">
              <div className="price-row">
                <span>Calculated Cost</span>
                <strong>{formatINR(calculations.calculatedCost)}</strong>
              </div>
              <div className="price-row">
                <span>Entered Price Before GST</span>
                <strong>{formatINR(form.priceBeforeGst)}</strong>
              </div>
              <div className="price-row">
              <span>Bed Cost</span>
              <strong>{formatINR(calculations.bedCost)}</strong>
              </div>
              <div className="price-row">
                <span>Bunk Bed Cost</span>
                <strong>{formatINR(calculations.bunkBedCost)}</strong>
              </div>
              <div className="price-row">
                <span>Workstation Cost</span>
                <strong>{formatINR(calculations.workstationCost)}</strong>
              </div>
              <div className="price-row">
                <span>Epoxy Flooring Cost</span>
                <strong>{formatINR(calculations.epoxyFlooringCost)}</strong>
              </div>
              <div className="price-row">
                <span>GST ({GST_PERCENT}%)</span>
                <strong>{formatINR(calculations.gst)}</strong>
              </div>
              <div className="divider small" />
              <div className="price-row total">
                <span>Final Price</span>
                <strong>{formatINR(calculations.finalPrice)}</strong>
              </div>
            </div>

            <button
              className="btn btn-primary full-btn"
              onClick={saveToGoogleSheet}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Non-Cost Data to Sheet"}
            </button>

            <button
              className="btn btn-secondary full-btn"
              onClick={generateQuotationPdf}
              disabled={pdfGenerating || !form.quotationNumber}
            >
              {pdfGenerating ? "Generating PDF..." : "Generate Quotation PDF"}
            </button>

            <div className="info-box">
              Quotation number will be generated only when you save.
            </div>

            {status ? <div className="status-box">{status}</div> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
