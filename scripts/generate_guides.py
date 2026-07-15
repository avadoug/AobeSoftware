from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf"
OUTPUT.mkdir(parents=True, exist_ok=True)

GREEN = colors.HexColor("#176B5B")
INK = colors.HexColor("#202823")
MUTED = colors.HexColor("#66716B")
PALE = colors.HexColor("#E5F2EE")
BORDER = colors.HexColor("#D8E1DC")
ORANGE = colors.HexColor("#D7862F")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="GuideTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=25, leading=29, textColor=INK, alignment=TA_LEFT, spaceAfter=10))
styles.add(ParagraphStyle(name="Subtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=11.5, leading=17, textColor=MUTED, spaceAfter=22))
styles.add(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=GREEN, spaceBefore=12, spaceAfter=8, keepWithNext=True))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=11.5, leading=15, textColor=INK, spaceBefore=9, spaceAfter=5, keepWithNext=True))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.5, leading=14, textColor=INK, spaceAfter=7))
styles.add(ParagraphStyle(name="Bulletx", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.3, leading=13.5, textColor=INK, leftIndent=16, firstLineIndent=-9, bulletIndent=5, spaceAfter=4))
styles.add(ParagraphStyle(name="Callout", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.2, leading=13.5, textColor=INK, leftIndent=10, rightIndent=10, spaceBefore=5, spaceAfter=5))
styles.add(ParagraphStyle(name="Smallx", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.8, leading=11, textColor=MUTED, spaceAfter=4))

class NumberedDocTemplate(BaseDocTemplate):
    def __init__(self, filename, guide_title, **kwargs):
        super().__init__(filename, title=guide_title, author="Aobe WorkTrack", **kwargs)
        self.guide_title = guide_title
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="normal")
        self.addPageTemplates(PageTemplate(id="guide", frames=frame, onPage=self.draw_page))

    def draw_page(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(GREEN)
        canvas.roundRect(doc.leftMargin, LETTER[1] - 0.63 * inch, 0.28 * inch, 0.28 * inch, 4, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawCentredString(doc.leftMargin + 0.14 * inch, LETTER[1] - 0.54 * inch, "W")
        canvas.setFillColor(INK)
        canvas.setFont("Helvetica-Bold", 8.5)
        canvas.drawString(doc.leftMargin + 0.37 * inch, LETTER[1] - 0.55 * inch, "Aobe WorkTrack")
        canvas.setStrokeColor(BORDER)
        canvas.line(doc.leftMargin, 0.55 * inch, LETTER[0] - doc.rightMargin, 0.55 * inch)
        canvas.setFillColor(MUTED)
        canvas.setFont("Helvetica", 7.5)
        canvas.drawString(doc.leftMargin, 0.36 * inch, self.guide_title)
        canvas.drawRightString(LETTER[0] - doc.rightMargin, 0.36 * inch, f"Page {doc.page}")
        canvas.restoreState()

def p(text, style="Bodyx"):
    return Paragraph(text, styles[style])

def bullets(items):
    return [Paragraph(f"- {item}", styles["Bulletx"]) for item in items]

def callout(title, text):
    table = Table([[Paragraph(f"<b>{title}</b><br/>{text}", styles["Callout"])]], colWidths=[6.75 * inch])
    table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), PALE), ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#BDD9D1")), ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    return table

def cover(title, subtitle):
    return [Spacer(1, 0.55 * inch), p("AOBE WORKTRACK", "Smallx"), p(title, "GuideTitle"), p(subtitle, "Subtitle"), callout("Local and private", "No account, tracking, cloud database, API key, or internet connection is required for ordinary use."), Spacer(1, 0.22 * inch)]

def build(filename, title, story):
    doc = NumberedDocTemplate(str(OUTPUT / filename), title, pagesize=LETTER, rightMargin=0.62 * inch, leftMargin=0.62 * inch, topMargin=0.78 * inch, bottomMargin=0.72 * inch)
    doc.build(story)

user = cover("User Guide", "Start work, record breaks and trips, create reports, and protect your records.")
user += [p("Start in under a minute", "H1x"), p("Open Aobe WorkTrack. Enter your name or choose <b>Skip Setup and Start Tracking</b>. Rates and other defaults are optional and can be added later in Settings."), p("The Today page shows only actions that make sense now. If nothing is active, Start work and Start trip are visible. If work is running, the live timer and break/end actions replace them."), p("Record a normal workday", "H1x")]
user += bullets(["Choose <b>Start work</b>. Add an optional job, location, rate, tags, or note, then confirm.", "Choose <b>Start break</b>, name it, and select paid or unpaid.", "Choose <b>End break</b> when you return.", "Choose <b>End work</b> when the shift finishes."])
user += [callout("Timer recovery", "The app stores real start timestamps. Minimizing, refreshing, sleeping, losing internet, or restarting does not reset active work or trips."), p("Manual hours and corrections", "H1x"), p("Use <b>Add manual entry</b>, or Quick Add and <b>Completed shift</b>. Enter start/end times or leave both blank and enter a duration. Work ending after midnight uses the next calendar date. History's pencil button edits saved records."), p("Unusual overlaps, decreasing odometers, missing trip purpose, and long entries produce a clear warning. Valid unusual work can be kept after review."), p("Mileage", "H1x"), p("Add a vehicle when you want odometer checks and automatic current-odometer updates. A profile is helpful, not required.")]
user += bullets(["Choose <b>Start trip</b> and add a purpose, category, vehicle/job, and optional starting odometer/location.", "At the destination, choose <b>End trip</b>.", "Enter the ending odometer or direct distance. Add destination, tolls, parking, and notes if useful.", "Only Business is included in mileage reimbursement estimates by default. Commuting and personal trips are never silently classified as business."])
user += [p("Calendar and History", "H1x"), p("Calendar shows hours and trip indicators in a month grid. Select a date to read that day's records. History searches jobs, purposes, destinations, notes, and tags; it can sort by date, hours, distance, or amount."), p("The trash button moves a shift or trip to Recently Deleted and briefly offers Undo. Recently Deleted supports restoration and carefully confirmed permanent removal."), p("Reports", "H1x")]
user += bullets(["Choose Today, a week, month, pay period, year, or custom date range.", "Turn detail sections and the signature line on or off.", "Use PDF for a finished document, XLSX for separate typed worksheets, CSV for plain data, or printable HTML for any browser.", "Every amount is labeled as an estimate. The app is not payroll, tax, or legal software."])
user += [p("Backups", "H1x"), p("Open <b>Settings &gt; Backup &amp; import</b> and choose <b>Back Up Now</b>. Keep the downloaded JSON somewhere outside the device/browser profile. To restore, choose the file, review counts, and confirm. Integrity and structure are checked before any change, and a local safety snapshot is created first."), callout("Important for web/PWA use", "Browser data is not cloud-synced. Clearing site data can erase records. Desktop and web records stay separate unless you move a complete backup between them."), p("Accessibility and privacy", "H1x")]
user += bullets(["Ctrl+N opens Quick Add on desktop. Essential workflows support keyboard navigation and visible focus.", "Choose system, light, or dark mode; high contrast; text size; and reduced motion.", "Notifications are optional. Denial does not reduce tracking accuracy.", "Version 1.0 does not collect GPS. Use odometer or direct distance offline.", "No analytics, ads, account, or telemetry is included."])
user += [p("Need a safe practice?", "H1x"), p("Back up before large imports, restoring old data, changing computers, or clearing a browser. Keep at least one recent backup that is not stored only on the same device."), p("Tax and reimbursement treatment varies. Aobe WorkTrack records information but does not provide tax or legal advice.", "Smallx")]
build("User-Guide.pdf", "User Guide", user)

install = cover("Installation Guide", "Install the Windows app or the browser PWA without development tools.")
install += [p("Windows installer", "H1x")]
install += bullets(["Open <b>Aobe-WorkTrack-Setup-1.0.0.exe</b>.", "Follow the short per-user installer. Administrator access is not normally required.", "Launch Aobe WorkTrack from the Start Menu (or desktop shortcut when selected).", "Enter your name, set optional defaults, or choose Skip Setup and Start Tracking."])
install += [callout("No setup tools", "Aobe never needs Python, Node.js, Rust, SQLite, a command prompt, a server, an account, or an API key."), p("Portable version", "H1x"), p("Open the folder <b>Aobe-WorkTrack-Portable-1.0.0</b> and run the executable. Current Windows 10/11 includes the required WebView2 runtime. The program file can move, but its private SQLite data remains in the current Windows user's application-data folder. Use a backup to move records."), p("Install the web/PWA version", "H1x")]
install += bullets(["Open the deployed Aobe WorkTrack URL in a current Chrome, Edge, Firefox, or Safari browser.", "Allow the first load to finish while online.", "Use the browser's Install app or Add to Home Screen command when available.", "Open the installed icon. The application shell now works offline."])
install += [PageBreak(), p("First launch", "H1x"), p("Only a display name is expected. Hourly rate, mileage rate, currency, week start, time format, and distance unit are optional. All can be changed later without rewriting old records."), p("Updates", "H1x"), p("Ordinary Windows upgrades preserve the local app-data database. The PWA shows an Update ready notice when a new version is downloaded; choose Update when no form has unsaved changes. Back up before major upgrades."), p("Storage", "H1x")]
install += bullets(["Windows: private SQLite database in the per-user Tauri application-data directory.", "Web/PWA: IndexedDB for the exact site origin and browser profile.", "No automatic synchronization exists between versions or devices."])
install += [p("Troubleshooting", "H1x")]
install += bullets(["Windows reputation prompt: unsigned community builds can trigger the standard prompt. Confirm the file/checksum came from the trusted release source.", "Blank or stale PWA: reconnect, reload once, and accept the update prompt.", "Missing browser records: confirm the same URL and browser profile; preview and production URLs have separate storage.", "Export missing: allow downloads for the site or choose a different folder in the desktop file dialog.", "Restore rejected: use the original unedited backup file; integrity checking intentionally rejects modifications."])
build("Installation-Guide.pdf", "Installation Guide", install)

backup = cover("Backup Guide", "Create, verify, restore, and move complete local records safely.")
backup += [p("What is protected", "H1x"), p("A complete JSON backup contains settings, shifts and breaks, trips, vehicles, jobs, expenses, notes, presets, saved-report metadata, and audit events. It includes a format version, creation timestamp, and SHA-256 integrity value. It contains no executable code."), p("Create a complete backup", "H1x")]
backup += bullets(["Open <b>Settings &gt; Backup &amp; import</b>.", "Choose <b>Back Up Now</b>.", "Select a safe destination if Windows asks, or keep the browser download.", "Copy the file to storage outside the device/browser profile."])
backup += [callout("Two layers", "The app keeps up to ten automatic/manual local snapshots for recent mistakes. Downloaded backups protect against device loss or cleared browser storage. Use both."), p("Restore", "H1x")]
backup += bullets(["Choose <b>Choose backup file</b> and select the original JSON.", "Review creation time and counts for shifts, trips, vehicles, jobs, expenses, and notes.", "Choose <b>Restore backup</b>.", "The app creates a before-import safety snapshot, then replaces records/settings only after validation succeeds."])
backup += [p("A damaged, edited, oversized, incomplete, or future-version file is safely rejected before data changes.", "Bodyx"), PageBreak(), p("Move between desktop and web", "H1x"), p("Create a backup in the source version and restore it in the destination. Confirm counts before restore. Desktop and web do not automatically sync, so repeat this process when intentionally moving newer records."), p("CSV imports", "H1x"), p("CSV is for bringing shift or mileage rows from another source, not for complete recovery. Choose Shift data or Mileage data, review detected columns/warnings/duplicates, then import valid rows. A safety snapshot is created first. Formula-like cells are treated as text."), p("Recovery order", "H1x")]
backup += bullets(["Restore the newest trusted downloaded backup.", "If none exists, restore a recent local snapshot in Settings.", "If an export failed but the app still opens, do not clear storage; retry another path.", "Never manually edit backup JSON. Editing invalidates the integrity value."])
backup += [p("Suggested routine", "H1x")]
routine = [[p("When", "H2x"), p("Action", "H2x")], [p("Weekly", "Bodyx"), p("Download a complete backup and keep it outside the device.", "Bodyx")], [p("Before import/restore", "Bodyx"), p("Create a fresh backup. The app also creates a safety snapshot.", "Bodyx")], [p("Before changing computers", "Bodyx"), p("Back up, restore on the new computer, and compare record counts.", "Bodyx")], [p("Before clearing browser data", "Bodyx"), p("Back up and verify the downloaded file is not zero bytes.", "Bodyx")]]
table = Table(routine, colWidths=[1.7 * inch, 5.05 * inch], repeatRows=1)
table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), PALE), ("GRID", (0, 0), (-1, -1), 0.5, BORDER), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
backup += [table, Spacer(1, 0.12 * inch), callout("Sensitive records", "Backups are not encrypted by the app. Anyone who can read the file can read its records. Store it in an encrypted drive or trusted secured folder when needed.")]
build("Backup-Guide.pdf", "Backup Guide", backup)

print(f"Generated PDFs in {OUTPUT}")
