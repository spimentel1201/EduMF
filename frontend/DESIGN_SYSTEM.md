# EduMF Design System (V2)

## Overview
This document outlines the design system for the EduMF project based on the "Analytics Dashboard" UI reference. All future iterations must follow these guidelines.

## 1. Color Palette

### Sidebar (Dark Theme)
- **Background**: `#2b303b` (Dark Slate / Blue-Gray)
- **Text (Inactive)**: `#a0aec0` (Gray-400 equivalent), `#cbd5e0` (Gray-300)
- **Text (Active/Hover)**: `#ffffff` (White)

### Primary Accent
- **Primary Color**: `#538f65` (Muted/Nature Green)
- **Usage**: Active sidebar items, primary buttons (e.g., "+ Nuevo Reporte"), and key indicators.

### Backgrounds & Surfaces
- **Main App Background**: `#f4f7f6` or `#f9fafb` (Very light gray, slightly cool)
- **Cards/Containers**: `#ffffff` (White)

### Status Colors
- **Success/Positive**: `#38a169` (Green, for upward trends)
- **Critical/Negative**: `#e53e3e` (Red, for "Crítico" and downward trends)
- **Pending/Warning**: `#dd6b20` (Orange/Yellow, for pending items)
- **Info**: `#3182ce` (Blue, for general info indicators)

## 2. Typography
- **Font Family**: Clean, modern Sans-Serif (e.g., Inter, Roboto, or system sans-serif).
- **Headings**: Bold, high contrast. e.g. Dashboard titles are dark (`#1a202c`), `font-bold`, large sizes (`text-2xl` or `text-3xl`).
- **Subtitles/Small Text**: Lighter gray (`#718096`), `text-sm`, for context and descriptions.

## 3. UI Components Architecture

### Layout Structure
- **Sidebar**: Fixed on the left (`w-64` to `w-72`), full height (`h-screen`). Contains logo at top, navigation items, and fixed user profile at the bottom.
- **Main Area**: Takes remaining space (`flex-1`). Contains a header with page title, secondary info (date, subtitle), and actions (notifications, primary button).
- **Content Grid**: Use CSS Grid or Flexbox to place summary cards at the top, and larger detailed charts / lists below.

### Components
- **Cards**:
  - Properties: `bg-white`, `rounded-2xl` (large border radius), subtle drop shadow (`shadow-sm` or custom very light shadow).
  - Padding: generous padding (e.g., `p-6`).
- **Buttons**:
  - Primary: `bg-[#538f65] text-white rounded-lg px-4 py-2 font-medium hover:bg-opacity-90`.
- **Sidebar Navigation Items**:
  - Padding: `px-4 py-3`.
  - Margin: `mx-4 my-1`.
  - Border Radius: `rounded-lg` or `rounded-xl`.
  - Active State: `bg-[#538f65] text-white shadow-md`.
  - Inactive State: `hover:bg-gray-800 text-gray-400 hover:text-white`.

## 4. Icons
- Standardized to use line-icons (e.g., Heroicons outline). Ensure icons have appropriate contrast. Active sidebar icons should be white.
