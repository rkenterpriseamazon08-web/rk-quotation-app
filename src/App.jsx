import React, { useMemo, useState } from "react";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyk9oTwc8eAHRsJEFx1YStCf7TLH-Ub97odrqovpLD9eNhJmy5RZYASgqEkOYxGm73vKA/exec";

const GST_PERCENT = 18;

const initialForm = {
  quotationNumber: "",
  quotationDate: new Date().toISOString().split("T")[0],
  clientName: "",
  companyName: "",
  projectLocation: "",
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
  acProvision: true,
  toiletUnit: true,
  insulation: true,
  glassDoor: false,
  aluminiumWindow: true,
  falseCeiling: false,
};

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
    projectLocation: form.projectLocation,
    contactNumber: form.contactNumber,
    email: form.email,
    notes: form.notes,
    containerLength: form.containerLength,
    containerWidth: form.containerWidth,
    containerHeight: form.containerHeight,
    distanceToSite: form.distanceToSite,
    partitions: form.partitions,
    doors: form.doors,
    windows: form.windows,
    acProvision: form.acProvision ? "Yes" : "No",
    toiletUnit: form.toiletUnit ? "Yes" : "No",
    insulation: form.insulation ? "Yes" : "No",
    glassDoor: form.glassDoor ? "Yes" : "No",
    aluminiumWindow: form.aluminiumWindow ? "Yes" : "No",
    falseCeiling: form.falseCeiling ? "Yes" : "No",
    finalQuotedPrice: Math.round(calculations.finalPrice),
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
          onChange(type === "number" ? Number(e.target.value) : e.target.value)
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
  const area = Number(form.containerLength || 0) * 10;

  const steelCost = area * 190;
  const sheetMetalCost = area * 231;
  const flooringCost = area * 90;
  const electricalCost = area * 100;
  const paintingCost = area * 60;
  const doorCost = Number(form.doors || 0) * 6000;
  const windowCost = Number(form.windows || 0) * 3500;
  const partitionCost = Number(form.partitions || 0) * 10000;
  const laborCost = area * 100;
  const transportCost = Number(form.distanceToSite || 0) * 120;
  const toiletCost = form.toiletUnit ? 20000 : 0;
  const insulationCost = form.insulation ? area * 155 : 0;
  const glassDoorCost = form.glassDoor ? 12000 : 0;
  const aluminiumWindowCost = form.aluminiumWindow ? 0 : 0;
  const falseCeilingCost = form.falseCeiling ? area * 110 : 0;

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
    falseCeilingCost;

  const gst = Number(form.priceBeforeGst || 0) * (GST_PERCENT / 100);
  const finalPrice = Number(form.priceBeforeGst || 0) + gst;

  return {
    area,
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
      setStatus("Please fill client name and project location before saving.");
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
      `${APPS_SCRIPT_URL}?action=generateQuotationPdf&quotationNumber=${encodeURIComponent(form.quotationNumber)}`
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
      setSearchStatus("Loading projects...");

      const response = await fetch(
        `${APPS_SCRIPT_URL}?action=getProjects&clientName=${encodeURIComponent(clientName)}`
      );
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to load projects");
      }

      setProjectOptions(result.projects || []);
      setSearchStatus("");
    } catch (error) {
      setProjectOptions([]);
      setSearchStatus(`Could not load projects. ${error.message}`);
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
      setSearchStatus("Please select client name and project name.");
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
                  Search saved quotations by client name and project name.
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
                <button className="btn btn-primary full-btn" onClick={fetchClients} disabled={searchLoading}>
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
                <label className="field-label">Project Name</label>
                <select
                  className="input"
                  value={searchProject}
                  disabled={!searchClient || !clientsLoaded}
                  onChange={(e) => setSearchProject(e.target.value)}
                >
                  <option value="">
                    {searchClient ? "Select project" : "Select client first"}
                  </option>
                  {projectOptions.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field field-bottom">
                <button className="btn btn-primary full-btn" onClick={handleSearch} disabled={searchLoading}>
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
                    <div className="record-subtitle">{record.projectLocation || "—"}</div>
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
                  <DetailBox label="Project Name" value={record.projectLocation} />
                  <DetailBox label="Contact Number" value={record.contactNumber} />
                  <DetailBox label="Email" value={record.email} />
                  <DetailBox
                    label="Container Size"
                    value={`${record.containerLength || "—"} x ${record.containerWidth || "—"} x ${record.containerHeight || "—"} ft`}
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
                  <DetailBox label="AC Provision" value={record.acProvision} />
                  <DetailBox label="Toilet Unit" value={record.toiletUnit} />
                  <DetailBox label="Insulation" value={record.insulation} />
                  <DetailBox label="Glass Door" value={record.glassDoor} />
                  <DetailBox label="Aluminium Window" value={record.aluminiumWindow} />
                  <DetailBox label="False Ceiling" value={record.falseCeiling} />
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
              <h1 className="hero-title">R.K. Enterprise Quotation System</h1>
              <p className="hero-subtitle">
                Generate container quotations and save them to Google Sheets.
              </p>
            </div>

            <div className="hero-side">
              <div className="quote-summary">
                <div className="summary-row">
                  <span>Quotation No.</span>
                  <strong>{form.quotationNumber || "Will be generated on save"}</strong>
                </div>
                <div className="summary-row">
                  <span>Quotation Date</span>
                  <strong>{form.quotationDate}</strong>
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
              <Field label="Client Name" value={form.clientName} onChange={(v) => setForm({ ...form, clientName: v })} />
              <Field label="Company Name" value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} />
              <Field
                label="Project Location"
                value={form.projectLocation}
                onChange={(v) => setForm({ ...form, projectLocation: v })}
              />
              <Field
                label="Contact Number"
                value={form.contactNumber}
                onChange={(v) => setForm({ ...form, contactNumber: v })}
              />
              <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
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
                  onChange={(e) => setForm({ ...form, containerLength: Number(e.target.value) })}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={40}>40</option>
                </select>
              </div>

              <Field label="Container Width (ft)" type="number" value={10} onChange={() => {}} readOnly />
              <Field label="Container Height (ft)" type="number" value={10} onChange={() => {}} readOnly />
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
              <Field label="Doors" type="number" value={form.doors} onChange={(v) => setForm({ ...form, doors: v })} />
              <Field
                label="Windows"
                type="number"
                value={form.windows}
                onChange={(v) => setForm({ ...form, windows: v })}
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
                label="Aluminium Window"
                checked={form.aluminiumWindow}
                onChange={(v) => setForm({ ...form, aluminiumWindow: v })}
              />
              <ToggleField
                label="False Ceiling"
                checked={form.falseCeiling}
                onChange={(v) => setForm({ ...form, falseCeiling: v })}
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
  <DetailBox label="Project" value={form.projectLocation || "—"} />
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
    <span>GST ({GST_PERCENT}%)</span>
    <strong>{formatINR(calculations.gst)}</strong>
  </div>
  <div className="divider small" />
  <div className="price-row total">
    <span>Final Price</span>
    <strong>{formatINR(calculations.finalPrice)}</strong>
  </div>
</div>
            <button className="btn btn-primary full-btn" onClick={saveToGoogleSheet} disabled={saving}>
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
