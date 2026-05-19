<p align="center">
  <img src="https://em-content.zobj.net/source/apple/391/brain_1f9e0.png" width="120" />
</p>

<h1 align="center">Cortex</h1>

<p align="center">
  <strong>generate. analyze. improve.</strong>
</p>

<p align="center">
  <a href="#what-cortex-does">What</a> •
  <a href="#how-it-works">How it works</a> •
  <a href="#features">Features</a> •
  <a href="#tech-stack">Stack</a> •
  <a href="#running-the-project">Run it</a> •
  <a href="#environment-variables">Environment</a> •
  <a href="#tribe-v2-note">TRIBE v2</a> •
  <a href="#built-for">Built for</a>
</p>

**Generate ads, test them with AI, and understand how they may perform before launch.**

Cortex is a hackathon project built for EurHackNL 2026. It helps users create ad creatives in different formats, save them, and analyze text, audio, or video ads with TRIBE v2 neural feedback.
We want to make marketing more accessible to founders. Instead of needing a big agency budget, lab testing, or a full marketing team, Cortex gives early feedback on how a creative might perform in areas like attention, memory, emotion, language, and overall impact.


The goal is simple: instead of launching an ad and only learning from clicks later, Cortex gives early feedback on how a creative might perform in areas like attention, memory, emotion, language, and overall impact.

## What Cortex Does

Cortex has three main parts:

1. **Ad Generation**
   - Generate text ad copy
   - Generate image ads
   - Generate video ads
   - Generate audio voiceovers

2. **Creative Gallery**
   - Save generated ads
   - View previous creatives
   - Delete unwanted assets
   - Reuse saved media for analysis

3. **Neural Feedback**
   - Analyze text, audio, or video using TRIBE v2
   - Show predicted brain activation results
   - Display scores for attention, memory, emotion, language, and overall impact
   - Export saved results as CSV or PDF reports

## How It Works

User writes an ad prompt  
↓  
Cortex generates creative options  
↓  
User saves the best ad  
↓  
Cortex sends it to TRIBE v2  
↓  
User receives neural feedback scores

## Features

- AI text ad generation
- AI image generation
- AI video generation
- AI audio generation
- Saved creative gallery
- TRIBE v2 neural response analysis
- Brain activation viewer
- CSV export
- PDF neuro report export
- Meta Ads integration placeholder

## Tech Stack

| Layer | Technology |
|------|------------|
| Frontend | React, TanStack Start, Vite |
| Styling | Tailwind CSS, Radix UI |
| Database | Supabase |
| Storage | Supabase Storage |
| Text Generation | OpenRouter |
| Image Generation | Gemini |
| Video Generation | Pollinations |
| Audio Generation | ElevenLabs |
| Neural Analysis | TRIBE v2 |

## Supported Neural Analysis Inputs

| Input Type | Supported |
|-----------|-----------|
| Text | Yes |
| Audio | Yes |
| Video | Yes |
| Image | No |

TRIBE v2 does not support direct image analysis in this demo.

## Running the Project

Install dependencies:

`bun install`

Start the development server:

`bun run dev`

Open:

`http://localhost:5173`

You can also use npm:

`npm install`

`npm run dev`

## Environment Variables

Create a `.env` file using `.env.example`.

Main variables used by the project:

`VITE_SUPABASE_URL=`

`VITE_SUPABASE_PUBLISHABLE_KEY=`

`SUPABASE_SERVICE_ROLE_KEY=`

`OPENROUTER_API_KEY=`

`GEMINI_API_KEY=`

`ELEVENLABS_API_KEY=`

`POLLINATIONS_API_KEY=`

`TRIBE_API_URL=`

`VITE_TRIBE_API=`

Do not expose server-only keys in public frontend variables.

## Project Structure

`src/components/cortex/Dashboard.tsx`

`src/components/cortex/NeuralFeedback.tsx`

`src/components/cortex/BrainActivationViewer.tsx`

`src/components/cortex/Sidebar.tsx`

`src/lib/cortex.functions.ts`

`src/routes/dashboard.tsx`

`src/routes/neural-feedback.tsx`

`src/routes/integrations.tsx`

`supabase/migrations/`

## TRIBE v2 Note

This project uses TRIBE v2 as a non-commercial hackathon proof of concept.

Cortex is an independent student project and has no association, partnership, sponsorship, or endorsement from Meta.

The neural scores are demo-level estimates and should not be treated as medical, scientific, or guaranteed marketing results. They are meant to help users compare creative ideas and get early feedback before launching a campaign.

A commercial version would need proper permission, a partnership, or a separate model that can legally be used in production.

## Limitations

- TRIBE v2 analysis can take several minutes.
- Image ads cannot be analyzed directly.
- Meta Ads publishing is not fully implemented yet.
- The neural scores are simplified for the demo.
- The app depends on external AI APIs being configured correctly.

## Built For

EurHackNL 2026
