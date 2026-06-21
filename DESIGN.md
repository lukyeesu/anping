---
name: Anping ClinicHub Design System
description: Visual system for a clean, professional, and trustworthy clinic management console
colors:
  primary: "#0ea5e9"
  primary-hover: "#0284c7"
  primary-light: "#f0f9ff"
  success: "#10b981"
  danger: "#f43f5e"
  warning: "#f59e0b"
  bg-slate-50: "#f8fafc"
  border-slate-100: "#f1f5f9"
  border-slate-200: "#e2e8f0"
  text-slate-500: "#64748b"
  text-slate-600: "#475569"
  text-slate-700: "#334155"
  text-slate-800: "#1e293b"
typography:
  display:
    fontFamily: "Kanit, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Kanit, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Kanit, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Sarabun, sans-serif"
    fontSize: "16px"
    lineHeight: "1.6"
  label:
    fontFamily: "Kanit, sans-serif"
    fontSize: "14px"
    letterSpacing: "-0.01em"
  mono:
    fontFamily: "JetBrains Mono, Roboto Mono, monospace"
    fontSize: "15px"
    letterSpacing: "-0.02em"
rounded:
  card: "24px"
  input: "16px"
  button: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.button}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  card-base:
    backgroundColor: "#ffffff"
    rounded: "{rounded.card}"
    padding: "28px"
  input-base:
    backgroundColor: "{colors.bg-slate-50}"
    rounded: "{rounded.input}"
    padding: "14px 20px"
---

# Design System: Anping ClinicHub

## 1. Overview

**Creative North Star: "The Clinical Precision Hub"**

Anping ClinicHub centers around a tactile, highly clean, and density-optimized grid layout. Built to support rapid clinical tasks, EMR reading, and billing flows, the design prioritizes clean cards and clear monospaced numbers. The interface aims to evoke a feeling of security, speed, and accuracy, making the system disappear into the background so medical staff can focus entirely on patients.

### Key Characteristics:
- **Tactile Comfort:** Friendly 16px and 24px rounded corners across form inputs, buttons, and card containers.
- **Medical Legibility:** Clear contrast typography using Kanit for Thai headers, JetBrains Mono for monospaced vitals/codes, and Sarabun for readability in EMR tables.
- **Adaptive Space:** Auto-hiding header and bottom navigation elements on mobile viewports to maximize content visibility while scrolling.

## 2. Colors

The color palette is clean, clinical, and strictly functional, prioritizing high contrast and state-rich feedback.

### Primary
- **Reassuring Sky Blue** (#0ea5e9 / oklch(67.75% 0.187 239.5)): Used exclusively for primary action triggers, interactive focus rings, selection indicator badges, and current navigation paths.

### Secondary
- **Clinical Emerald** (#10b981): Used for active queues, success toasts, verified card scans, and online status indicators.
- **Alert Rose** (#f43f5e): Reserved for emergency contacts, deletion triggers, invalid validations, and error flags.

### Neutral
- **Body Background Slate** (#f8fafc): Base background layout.
- **Card Background White** (#ffffff): Clean background panel for cards and modal dialogs.
- **Ink Charcoal Slate** (#1e293b / #334155): Primary body text and headers ensuring a contrast ratio ≥ 4.5:1.

**The Reassuring Accent Rule.** The primary blue accent is reserved for primary actions, selection states, and focus states. It must never exceed 10% of any screen surface.

## 3. Typography

**Display Font:** Kanit (with sans-serif)
**Body Font:** Sarabun (with sans-serif)
**Label/Mono Font:** JetBrains Mono (with Roboto Mono, monospace)

The pairing of geometric Kanit headers and humanist Sarabun body text provides excellent readability for both short Thai medical notes and dense multi-column EMR tables.

### Hierarchy
- **Display** (Bold, 30px / 1.875rem, letter-spacing: -0.01em): Main headers like Dashboard overview and system module titles.
- **Headline** (Bold, 24px / 1.5rem, letter-spacing: -0.01em): Sub-section titles and modal headers.
- **Title** (Semibold, 20px / 1.25rem, letter-spacing: -0.01em): Card module headers.
- **Body** (Regular, 16px / 1rem, line-height: 1.6): Patient records, body paragraphs, and EMR tables.
- **Label** (Medium, 14px / 0.875rem, letter-spacing: -0.01em): Form titles and badges.
- **Mono** (Regular, 15px / 0.9375rem, letter-spacing: -0.02em): Alphanumeric codes (HN, Citizen ID, queue indexes, prices, and timestamp data).

**The Monospace Contrast Rule.** All alphanumeric codes (HN, Citizen ID, queue index, prices) must use JetBrains Mono or Roboto Mono with high contrast colors to ensure prompt and error-free reading.

## 4. Elevation

The system is flat-by-default, utilizing light border lines and subtle shadows to divide information instead of heavy, stacked layers.

### Shadow Vocabulary
- **Ambient Card Layer** (`0 1px 2px 0 rgba(0, 0, 0, 0.05)`): Standard layout elevation for cards.
- **Active Glass Overlay** (`0 8px 32px rgba(0, 0, 0, 0.04)`): Used for fixed headers and sliding bottom navigation panels.

## 5. Components

### Buttons
- **Shape:** Rounded (16px / 1rem) corners.
- **Primary:** Background sky-500 (#0ea5e9), text color white. Height (48px / 3rem) for touch compliance.
- **Hover / Focus:** Hover changes background to sky-600 (#0284c7). Focus uses custom sky-500/20 rings.
- **Interactive Feedback:** Transition scale active (`active:scale-95`) triggers on click.

### Cards / Containers
- **Corner Style:** Rounded (24px / 1.5rem) corners.
- **Background:** White (#ffffff) with Slate border (#f1f5f9 / 50% opacity).
- **Internal Padding:** Spacing xxl (28px / 1.75rem).

### Inputs / Fields
- **Style:** Background slate-50, border slate-200, rounded (16px / 1rem) corners.
- **Focus:** Border transitions to sky-500, background changes to white, and applies a `focus:ring-2 focus:ring-sky-500/20` glow.

### Navigation
- **Sidebar (PC):** Left-side navigation with smooth horizontal drag expansion, utilizing glassmorphism attributes.
- **Bottom Bar (Mobile):** Auto-hiding sticky footer bar (`pb-[safe-area-inset]`) utilizing bubble animations on selection change.

## 6. Do's and Don'ts

### Do:
- **Do** use distinct active scale-down (`scale-95`) transitions on all button triggers to provide physical tactile feedback.
- **Do** ensure all text colors adhere to a contrast ratio ≥ 4.5:1 against their backgrounds (e.g. text-slate-800 on white card background).
- **Do** utilize the JetBrains Mono font face for all code records (HN, card scanners) to allow staff to notice alphanumeric characters clearly.

### Don't:
- **Don't** use side-stripe borders (such as `border-left-4` as an accent) on alerts, queue cards, or transaction history.
- **Don't** animate image thumbnails, icons, or cards on hover, to keep the UI professional and prevent GPU lag.
- **Don't** use custom scrollbars that deviate from standard browser defaults, except to apply a minimal, rounded scroll overlay.
