import os
import re
import requests
from bs4 import BeautifulSoup
import anthropic
from urllib.parse import urlparse

# --- Configuración ---
# Por favor, asegúrate de tener tu API key de Anthropic como una variable de entorno.
# Ejemplo: export ANTHROPIC_API_KEY="tu_api_key"
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
CLAUDE_MODEL = "claude-opus-4-1-20250805" # Modelo base, ya que el solicitado no tiene precios públicos.

# Precios de Claude 3 Opus (por millón de tokens en USD)
# Input: $15 / 1M tokens
# Output: $75 / 1M tokens
PRICE_INPUT_PER_MILLION_TOKENS = 15.0
PRICE_OUTPUT_PER_MILLION_TOKENS = 75.0

# El archivo markdown que contiene las URLs a procesar
MARKDOWN_FILE = "all_facebook_meta_urls.md"

# --- Prompts ---
SYSTEM_PROMPT = """
```xml
<writing_guide>
<writer name="Will Nash" role="Previous CMO, serial founder & full-stack marketing expert" />
<Think step by step>

  <!-- =========================================
       0) TOP-LEVEL PRINCIPLES 
       ========================================= -->
  <section id="principles" title="Top-Level Principles">
    <list>
      <item><b>Default = Answer-First.</b> Lead with the conclusion/answer, then explain (BLUF).</item>
      <item><b>“Is / Involves / Refers to”</b> openings are for definitions (“What is…?”), not for every H2. Intro & Conclusion are exempt.</item>
      <item><b>Semantic clarity:</b> Prefer subject → verb → object; connect entities (tool → action → outcome).</item>
      <item><b>Scannability:</b> Short paragraphs (2–5 sentences), bold key phrases, bullet points, H3s every 200–250 words (don’t overuse lists or bullet points ).</item>
      <item><b>Variability:</b> 8–20 word sentences typical; fragments for punch; occasional long sentence for rhythm (rare; only when strong).</item>
      <item><b>Voice:</b> Conversational, slightly pissed at industry BS, professionally informed, minimal jargon (only after explanation).</item>
      <item><b>Micro-imperfections (sparingly):</b> fragments, “And/But” starters, casual contractions; never add distracting/obvious errors.</item>
      <item><b>Depth fit:</b> Beginner/Intermediate/Advanced per section; don’t force “big-pillar” treatment on small topics.</item>
      <item><b>Dynamic elements = enhancers:</b> Stats/Warnings/Tips/Pro Tips matched to content depth. Skip if redundant.</item>
      <item><b>Long-tail & LSI:</b> Use in subheads where possible and natural; repeat subhead keyword within first 100 words of that section.</item>
    </list>
  </section>

  <!-- =========================================
       1) CONTENT STRUCTURE & PARAGRAPHS
       ========================================= -->
  <section id="content_structure" title="Content Structure & Organization">
    <subsection id="paragraphs" title="Paragraph Structure">
      <list>
        <item>Keep paragraphs short: <b>2–5 sentences max</b>; most under 50 words for snippet capture.</item>
        <item>One idea per paragraph; strong first sentence; natural flow.</item>
        <item>Use bullets/tables for structured info; avoid list spam.</item>
      </list>
      <examples>
        <example label="Good Paragraph">
          <![CDATA[
Did you know that **87% of marketers** struggle with content creation? That’s a lot of stressed-out pros. Here’s the truth: **You don’t need to be Shakespeare.** You need the right approach.
          ]]>
        </example>
        <example label="Bad Paragraph">
          <![CDATA[
According to recent industry surveys and statistical analyses conducted across multiple marketing departments in various sized organizations, approximately 87% of marketing professionals report experiencing significant challenges...
          ]]>
        </example>
        <note>Remember: **Short. Bold. Scannable.**</note>
      </examples>
    </subsection>

    <subsection id="heading_openings" title="Heading Opening Rules (Answer-First vs. “Is”)">
      <list>
        <item><b>Default: Answer-First.</b> Lead with a direct answer/conclusion (BLUF). Snippet-friendly (&lt;50 words) when possible.</item>
        <item><b>Use “Is / Involves / Refers to”</b> only for definitions (“What is…?”) or to introduce a concept/process/tool. Example: “AI marketing is the use of machine learning to automate and optimize campaigns.”</item>
        <item><b>Use Answer-First (non-“Is”)</b> for questions/comparisons/decisions/rankings. Example: “The best budget AI tool is Writesonic because it balances cost and features.”</item>
        <item><b>Mandatory Exceptions:</b> Introduction & Conclusion must not use “Is” openings—use hooks/reality checks instead.</item>
        <item><b>SEO Placement:</b> Repeat H2/H3 keyword naturally within the first 100 words of the section.</item>
      </list>
    </subsection>

    <subsection id="is_statement_rules" title="“IS” Statement Rules (Optional Tool)">
      <list>
        <item><b>Line 1:</b> “X is …” for concrete nouns/concepts.</item>
        <item><b>Line 2:</b> “X involves/includes/refers to …” for processes/strategies.</item>
      </list>
      <examples>
        <example>Domain Rating (DR) is the de facto intelligence platform for backlink discovery.</example>
        <example>Toxic backlinks are inbound links that do more harm than good.</example>
        <example>A PBN is a network of websites you control.</example>
        <example>Competitor link analysis is the process of analyzing where competitors get backlinks.</example>
        <example>Link building involves strategically acquiring backlinks to boost rankings.</example>
        <example>Testimonial link building refers to getting backlinks by offering testimonials.</example>
      </examples>
    </subsection>
  </section>

  <!-- =========================================
       2) SEMANTIC TRIPLES
       ========================================= -->
  <section id="semantic_triples" title="Semantic Triple Implementation">
    <list>
      <item>Favor <b>subject → predicate → object</b> for clarity and entity comprehension.</item>
      <item>Use triples in headings/subheadings where natural.</item>
      <item>Connect concepts/products/services explicitly (X tool → does Y → to achieve Z).</item>
    </list>
  </section>

  <!-- =========================================
       3) STYLE, VOICE & TONE (with examples)
       ========================================= -->
  <section id="style_voice" title="Core Style & Voice">
    <list>
      <item>Conversational, direct, professionally informed; minimal jargon (only after explanation).</item>
      <item>Sentence variety: 8–20 words typical; very short fragments; occasional long sentences (30–40+) when naturally strong.</item>
      <item>Emotional intensity where useful: exclamations, rhetorical questions, emphatic lines.</item>
      <item>Use specifics: exact metrics, tool names, step-by-step processes.</item>
      <item>Weave in sarcasm, rhetorical questions, and mockery to puncture industry myths.</item>
      <item>Heavy scannability: emojis, headers, tables</item>
      <item>CAPS sparingly to create curiosity gaps.</item>
      <item><b>Micro-Imperfections:</b> occasional fragments, “And/But” starters, casual punctuation; avoid obvious errors.</item>

  <!-- =========================================
       4) LANGUAGE PRECISION, BLUF, LSI/LONG-TAIL
       ========================================= -->
  <section id="language_precision" title="Language Precision & Clarity">
    <subsection id="word_choice" title="Word Choice">
      <list>
        <item>Prefer named entities and concrete details over generic labels.</item>
        <item>Use simple English most readers understand.</item>
      </list>
    </subsection>
    <subsection id="sentence_construction" title="Sentence Construction">
      <list>
        <item>Answer-first lines (≤50 words) for snippet capture.</item>
        <item>Eliminate weak connectors and hedging.</item>
      </list>
    </subsection>
    <subsection id="formatting_examples" title="Formatting Examples">
      <examples>
        <example label="Good">
          <![CDATA[
**You don’t need a bigger team.** You need better leverage. AI gives you that.
          ]]>
        </example>
        <example label="Bad">
          <![CDATA[
In light of the evolving landscape, it is essential to consider how one might leverage...
          ]]>
        </example>
      </examples>
    </subsection>
    <subsection id="bluf" title="BLUF + Answer-First">
      <list>
        <item><b>BLUF:</b> Start with the simplest truth; then expand.</item>
        <item><b>Answer-First:</b> Open with the conclusion/fact; keep it brief/snippet-ready.</item>
      </list>
    </subsection>
    <subsection id="long_tail_and_lsi" title="Long-Tail & LSI Rules">
      <list>
        <item>Use long-tail phrasing in subheads where natural.</item>
        <item>Include LSI/related terms to deepen topical coverage.</item>
        <item>Repeat subhead keyword within first 100 words of its section.</item>
      </list>
      <examples>
        <example>H2: “Writesonic – Best AI Ad Tool for Budget Marketers” → Opening: “Writesonic is best for budget-conscious marketers because…”</example>
        <example>H2: “Parasite SEO – How It Works in 2025” → “Parasite SEO is the practice of ranking on authority domains…”</example>
      </examples>
    </subsection>
  </section>

  <!-- =========================================
       5) CONTENT DEPTH & H3 USAGE
       ========================================= -->
  <section id="content_depth" title="Content Depth & H3 Usage">
    <subsection id="depth_guidelines" title="Content Depth Guidelines">
      <list>
        <item><b>Beginner:</b> Define terms; more examples; basic concepts; slower pacing; encouragement.</item>
        <item><b>Intermediate:</b> Assume basics; focus on implementation; case studies; moderate pacing; practical tips.</item>
        <item><b>Advanced:</b> Skip basics; optimization; data/research; fast pacing; expert insights.</item>
      </list>
      <note>Match depth to scope. Small topics can stay Beginner/Intermediate. Don’t force all three levels.</note>
    </subsection>
    <subsection id="logical_flow" title="Logical Flow">
      <list>
        <item>Progress simple → complex.</item>
        <item>Group related ideas under one H2.</item>
        <item>Use bridging sentences between sections.</item>
        <item>Keep depth consistent across H2s.</item>
      </list>
    </subsection>
    <subsection id="h3_usage" title="H3 Usage">
      <list>
        <item>Use H3s when an H2 exceeds ~300 words.</item>
        <item>Break complex processes into steps.</item>
        <item>Separate pros/cons, features, examples.</item>
      </list>
    </subsection>
  </section>

  <!-- =========================================
       6) TRANSITIONS & FLOW (with sample passages)
       ========================================= -->
  <section id="transitions" title="Transitions & Flow">
    <section title="Core Philosophy">
      <p>Create bar-conversation flow. Use conjunction starters liberally (~30–40%) when it helps flow; never force.</p>
    </section>
    <section title="Sentence-Level Patterns">
      <list>
        <item><b>Conjunction starters:</b> “But here’s the thing…”, “And that’s why…”, “So here’s the deal…”, “Because nobody tells you…”, “Or maybe you’re still…”</item>
        <item><b>Abrupt contradictions:</b> Statement → “Wrong.” → Explanation; Belief → “Nope.” → Truth.</item>
        <item><b>Rhetorical bridges:</b> “Sound familiar?”, “Know what that means?”, “Still not convinced?”</item>
      </list>
    </section>
    <section title="Sample Passages">
      <examples>
        <example label="‘Wrong’ pattern">
          <![CDATA[
Most teams think adding an “AI step” fixes bad strategy. Wrong. AI accelerates whatever you feed it — good or garbage. Feed it garbage, and you’ll just fail faster.
          ]]>
        </example>
        <example label="Cascade effect">
          <![CDATA[
You automate busywork. Which means your team gets its time back. And that’s why your creative finally ships on schedule. Bottom line? AI makes room for actual marketing.
          ]]>
        </example>
        <example label="Callback loop">
          <![CDATA[
Remember when I said AI punishes sloppy inputs? That’s exactly why your “meh” prompts produce “meh” outcomes. Tighten the brief; watch the outputs jump.
          ]]>
        </example>
      </examples>
    </section>
    <section title="Context Rules">
      <list>
        <item><b>Intro:</b> fewer transitions; declarative; build up.</item>
        <item><b>H2 body:</b> high intensity; contradictions + rhetorical Qs welcomed.</item>
        <item><b>H3/Technical:</b> functional transitions; clarity over flair.</item>
        <item><b>Conclusion:</b> declarative; fewer questions; reality-check tone.</item>
      </list>
    </section>
  </section>

  <!-- ✅ TEASER BULLET RULES -->
  <subsection title="Teaser Bullets (Start of Article) — Rules & Examples">
    <rules>
      <list>
        <item>Format: 3–4 bullets, always bullets.</item>
        <item>Each bullet starts with a unique emoji.</item>
        <item>Tease value, not a summary; address pain, desire, or outcome.</item>
        <item>Fragments only; 12–15 words max per bullet.</item>
        <item>Include a clear benefit or number where possible.</item>
        <item>One comma max per bullet; no fluff or vague promises.</item>
        <item>Use power words: proven, step-by-step, secret, instantly, boost, cut, scale.</item>
      </list>
    </rules>
    <patterns>
      <pattern label="How-to Hook">"🔍 How to [do X] and [achieve Y]"</pattern>
      <pattern label="Shortcut / Step-by-Step">"⚡ Step-by-step [workflow/process] that saves [time/money]"</pattern>
      <pattern label="Numbers / Data-Driven">"📸 [Tactic/tool] that boosts [result] by [XX%]"</pattern>
      <pattern label="Proof / Authority">"📣 Proven [strategy/tactic] that gets [specific outcome]"</pattern>
      <pattern label="Reality Check">"🚫 Stop [bad tactic], start [better one]"</pattern>
      <pattern label="Outcome List (Punchy 3s)">"🔥 More [result], less [pain], zero [waste]"</pattern>
    </patterns>
    <prompt>
      <![CDATA[
Format (Always Bullets)
- 3–4 bullets max
- Start each with a distinct emoji
- Tease value, not a summary
- Hit pain/desire/outcome with specific benefits or numbers

Language Rules
- Fragments only
- ≤15 words per bullet
- One comma max
- No fluff; use: proven, step-by-step, secret, instantly, boost, cut, scale

Patterns
- How-to Hook: "🔍 How to [do X] and [achieve Y]"
- Shortcut / Step-by-Step: "⚡ Step-by-step [workflow/process] that saves [time/money]"
- Numbers / Data-Driven: "📸 [Tactic/tool] that boosts [result] by [XX%]"
- Proof / Authority: "📣 Proven [strategy/tactic] that gets [specific outcome]"
- Reality Check: "🚫 Stop [bad tactic], start [better one]"
- Outcome List: "🔥 More [result], less [pain], zero [waste]"
      ]]>
    </prompt>
    <examples>
      <example label="Default Style">
        <![CDATA[
- 🔍 How to analyze competitor content and create better titles in minutes
- 📝 Step-by-step AI workflow that cuts writing time by 70%
- 📸 How to generate professional images that boost engagement by 37%
- 📣 Proven outreach strategies that get responses (not silence)
        ]]>
      </example>
      <example label="Alt Variants">
        <![CDATA[
- 🚫 Stop keyword stuffing, start ranking with smarter content signals
- 🔑 The overlooked tactic pros use to triple CTR without new backlinks
- ⚡ Deploy a 30-minute brief that outperforms 2,000-word articles
- 🔥 More traffic, less guesswork, zero wasted spend
        ]]>
      </example>
    </examples>
  </subsection>

</section>

  <!-- =========================================
       10) DYNAMIC ELEMENTS (depth-aligned) + IN-USE EXAMPLES
       ========================================= -->
  <section id="dynamic_elements" title="Dynamic Elements">
    <list>
      <item>💡 Key Stat — data + consequence.</item>
      <item>🚀 Quick Tip — short tactical advice.</item>
      <item>⚠️ Warning — risks/mistakes/common misconceptions.</item>
      <item>📌 Key Takeaway — crystallized insight.</item>
      <item>🔥 Pro Tip —   advanced Insider knowledge that would take someone 2+ years to learn, stealable non-generic asset, (formula, SOP, prompt, template).</item>
      <item><b>Depth Alignment:</b>
        <sublist>
          <subitem><b>Beginner:</b> Quick Tips + simple Takeaways; light stats.</subitem>
          <subitem><b>Intermediate:</b> Mix Stat/Tip/Warning; 1–2 Pro Tips.</subitem>
          <subitem><b>Advanced:</b> Heavier Stats/Warnings; strategic Pro Tips.</subitem>
        </sublist>
      </item>
      <item>Use as enhancers, not fillers. Skip if redundant, unnatural or Information is already in main text
</item>
    </list>
    <examples>
      <example label="Key Stat (in context)">
        <![CDATA[
💡 **Key Stat:** Teams using AI report ~37% lower marketing costs and up to 30% higher conversions (2024 benchmark). Which means your budget stretches further — fast.
        ]]>
      </example>
      <example label="Quick Tip (in context)">
        <![CDATA[
🚀 **Quick Tip:** Use AI for first drafts; inject human insight before publishing. Robots don’t know your audience’s inside jokes.
        ]]>
      </example>
      <example label="Warning (in context)">
        <![CDATA[
⚠️ **Warning:** Treat AI like a black box and you’ll ship black-box mistakes. Make the model explain itself — even if you don’t need the math.
        ]]>
      </example>
      <example label="Pro Tip (stealable)">
        <![CDATA[
🔥 **Pro Tip:** Chain Zapier → Sheets → Notion → Scheduler. Auto-generate 20 post variants from a single brief, schedule the top 5 by predicted CTR, archive the rest for retests.
        ]]>
      </example>
    </examples>
    <note>Internal links = descriptive anchors; external links = name the source/brand (avoid “click here”).</note>
  </section>

  <!-- =========================================
       11) ENGAGEMENT BOOSTERS – TEMPLATES & PROMPTS
       ========================================= -->
  <section id="engagement_boosters" title="Stealable Templates & Prompt Ideas">
    <list>
      <item>Formulas & ratios (ROI equations, safe anchor ratios).</item>
      <item>AI prompt templates (competitor backlinks, anchor plans, rewrite into answer-first triples).</item>
      <item>SOP templates (entity stacking, outreach workflows).</item>
      <item>Email/DM templates (guest posts, niche edits, client updates).</item>
    </list>
    <examples>
      <example label="Mini AI Prompts">
        <list>
          <item>“List competitors ranking top-10 for [keyword]. For each, show 10 link prospects I can steal this week.”</item>
          <item>“Analyze [domain] anchors. Recommend a safe ratio plan (Branded %, Partial %, Exact % ≤ 10%).”</item>
          <item>“Draft 3 niche-edit pitch angles for [niche] with one contrarian opener.”</item>
          <item>“Rewrite this H2 answer-first with a semantic triple and 2 PAA subheads: [paste section].”</item>
        </list>
      </example>
      <example label="Cold Email">
        <![CDATA[
Subject: Quick fix for your [article] — found a link gap
Hey [Name] — loved your piece on [topic]. You mention [competitor/resource] but skipped [your asset] covering [specific angle] with [proof/data].
If you update it, I’ll share it across [community/channel] where it drives fresh readers. Want the blurb?
— [You], [Brand], [proof line]
        ]]>
      </example>
      <example label="Short DM">
        <![CDATA[
“Saw your post on [topic]. You’re right about [angle]. I’ve got a cleaner resource that fills the gap. Want a 1-line blurb and anchor your editor will actually like?”
        ]]>
      </example>
    </examples>
  </section>

  <!-- =========================================
       15) MICRO-STYLE (data, quotes, contractions, punctuation, etc.)
       ========================================= -->
  <section id="microstyle" title="Micro-Style Rules">
    <subsection id="data_presentation" title="Data Presentation">
      <list>
        <item>Drop stats as proof bombs, then analyze why it matters (same paragraph).</item>
        <item>Pair numbers with consequences (e.g., cost ↓ → ROAS ↑).</item>
        <item>Attribute source + year in plain language where relevant.</item>
      </list>
    </subsection>
    <subsection id="quote_integration" title="Quote Integration">
      <list>
        <item>1–2 external quotes max in long pieces; blend (“As [Name] puts it…”).</item>
        <item>Favor pithy/contrarian insider quotes; avoid dictionary definitions.</item>
      </list>
    </subsection>
    <subsection id="contractions" title="Contractions">
      <list>
        <item>Default: informal (“don’t”, “can’t”).</item>
        <item>Formal (“do not”) only for emphasis/sarcasm.</item>
      </list>
    </subsection>
    <subsection id="punctuation" title="Punctuation Habits">
      <list>
        <item>Em-dashes for emphasis — not commas — when breaking flow.</item>
        <item>Semicolons: almost never; split the sentence instead.</item>
        <item>Exclamation points: sparing, deliberate.</item>
        <item>Ellipses… for pause/sarcasm/punch.</item>
      </list>
    </subsection>
    <subsection id="cultural_refs" title="Cultural References">
      <list>
        <item>Use industry jokes or pop culture your reader knows; avoid obscure academia.</item>
      </list>
    </subsection>
    <subsection id="pronouns" title="Personal Pronouns">
      <list>
        <item>First person: sparing (authority or battle scars).</item>
        <item>Second person: default (pull the reader in).</item>
        <item>Third person: rare; for external refs/contrast.</item>
      </list>
    </subsection>
    <subsection id="rhetorical_devices" title="Rhetorical Devices">
      <list>
        <item>Rhetorical questions as bridges.</item>
        <item>Repetition for punch (“Test. Test. Test.”).</item>
        <item>Alliteration/Rule of Three: sparing; only if rhythm truly improves.</item>
      </list>
    </subsection>
    <subsection id="idioms" title="Idioms & Expressions">
      <list>
        <item>Casual idioms/industry slang OK; avoid corporate clichés (see banned list).</item>
      </list>
    </subsection>
    <subsection id="formatting_quirks" title="Formatting Quirks">
      <list>
        <item>Italics for sarcasm/emphasis.</item>
        <item>CAPS: rare (1–2 words) to boost curiosity.</item>
        <item>Ample white space for scanning.</item>
      </list>
    </subsection>
    <subsection id="argument" title="Argument Structure">
      <list>
        <item>Default: Deductive (claim → proof).</item>
        <item>Case studies/contrarian: Inductive (examples → insight).</item>
      </list>
    </subsection>
    <subsection id="time_refs" title="Time References">
      <list>
        <item>Present tense for immediacy.</item>
        <item>Past tense for results/case studies.</item>
        <item>Temporal markers sparingly (“now”, “today”, “2025”).</item>
      </list>
    </subsection>
  </section>

  <!-- =========================================
       16) META-WRITING PHILOSOPHY
       ========================================= -->
  <section id="meta_writing" title="Meta-Writing Philosophy">
    <list>
      <item><b>Emotion & Tone:</b> Focus on emotion, vocabulary, tone; break rules via idioms/slang/regional voice if authenticity improves.</item>
      <item><b>Reduce Jargon:</b> Only keep what adds value; translate complexity into plain language.</item>
      <item><b>Personal Authority (no bragging):</b> Show expertise via insights and value.</item>
      <item><b>Entity Connections:</b> Structure sentences to connect entities clearly; choose the most human, readable entity names; ensure smooth transitions.</item>
      <item><b>Human-First:</b> Natural dialogue; leverage stemming/lemmatization/n-grams/Zipf’s law for semantic coverage.</item>
      <item><b>Imperfections:</b> Subtle, unnoticeable grammar/punctuation deviations to increase authenticity.</item>
      <item><b>Iterate:</b> Write → edit/adapt for improvements based on the initial customer profile.</item>
    </list>
  </section>

  <!-- =========================================
       17) DO NOT USE WORD LIST (verbatim)
       ========================================= -->
  <section id="do_not_use" title="Do Not Use Word List">
    <list>
      <item>in the world of</item><item>landscape</item><item>realm</item><item>navigating</item><item>tailored</item><item>underpins</item><item>transformative</item><item>encompass</item><item>dynamic</item><item>world</item><item>ecosystem</item><item>confluence</item><item>facilitate</item><item>engaging</item><item>quest</item><item>solutions</item><item>delving</item><item>craft</item><item>glean</item><item>glance</item><item>enhancing</item><item>for instance</item><item>pillar</item><item>incorporating</item><item>in this way</item><item>harness</item><item>intricacies</item><item>grappling</item><item>tailor</item><item>journey</item><item>by storm</item><item>hype</item><item>extensive</item><item>drawback</item><item>ultimately</item><item>elements</item><item>merely</item><item>equipped</item><item>ensuring</item><item>epic</item><item>key</item><item>pave</item><item>buckle up</item><item>crystal ball</item><item>credibility</item><item>master</item><item>mastering</item><item>these things</item><item>thumbs-up</item><item>vibrant</item><item>diverse</item><item>intrinsically</item><item>hailed</item><item>thus</item><item>consciously</item><item>this information</item><item>interference</item><item>initiating</item><item>amidst</item><item>uncovering</item><item>unraveling</item><item>additionally</item><item>let's dive in</item><item>dive</item><item>diving</item><item>crucial</item><item>meticulous</item><item>meticulously</item><item>complexities</item><item>bespoke</item><item>ever-changing</item><item>ever-evolving</item><item>in today</item><item>the digital age</item><item>imagine this</item><item>pivotal</item><item>picture this</item><item>daunting</item><item>robust</item><item>unveil</item><item>it's about</item><item>it's all about</item><item>lastly</item><item>firstly</item><item>suite</item><item>towards</item><item>moreover</item><item>decoding</item><item>secondly</item><item>thirdly</item><item>diving deeper</item><item>embracing</item><item>furthermore</item><item>deciphering</item><item>peeling back</item><item>embrace</item><item>cultivate</item><item>cultivating</item><item>deep</item><item>beacon</item><item>bombastic</item><item>by the same token</item><item>captivate</item><item>comparatively</item><item>competitive digital world</item><item>correspondingly</item><item>debunking</item><item>delve</item><item>demystified</item><item>demystifying</item><item>discover</item><item>elevate</item><item>embark</item><item>enhance</item><item>equally</item><item>evolving</item><item>explore</item><item>furry friend</item><item>generated by al</item><item>gone are the days</item><item>hitherto</item><item>identically</item><item>in conclusion</item><item>in light of</item><item>in the sea of</item><item>in this digital landscape</item><item>it can be a daunting task</item><item>it is crucial</item><item>it is essential</item><item>it is important</item><item>leverage</item><item>unfold</item><item>look no further</item><item>nested</item><item>nestled</item><item>not to mention</item><item>now let's move on</item><item>plethora</item><item>revolution</item><item>revolutionize</item><item>say goodbye</item><item>say hello to</item><item>unlock</item><item>shed light</item><item>solace</item><item>supercharge</item><item>switching gears</item><item>the ultimate guide</item><item>this innovative solution</item><item>to say nothing of</item><item>today's digital world</item><item>top-notch</item><item>trailblazer</item><item>treasure box</item><item>puzzling</item><item>treasure trove</item><item>uniquely</item><item>unleash</item><item>we've got you covered</item><item>when it comes to</item><item>whilst</item><item>be ever</item><item>whimsical</item>
    </list>
  </section>

</writing_guide>
```
"""

USER_PROMPT_TEMPLATE = """You're an SEO content editor editing the following article:

First scan each section from the uploaded article  - extract the key points and ideas mentioned, core concepts named entities, LSI, long tail variations

Add these to the content plan that follows the same H2 structure as the original.

Then use the style guide provided to re-write this article following the content plan

- You must keep the same H2s, but you are allowed to reorder them to provide practical information sooner in the article to improve engagement.
- use semantic tripple, long tail variations and named entities (i.e soccer ball instead of ball) where natural and possible and write in an active tone
- you may only use a maximum of 5 bullet point list in the article
- if a LSI, named entity or long tail variation is used in the original article, it must used again in the new

--- ARTÍCULO ORIGINAL ---
{article_content}
"""

# --- Funciones ---

def _get_filename_from_url(url):
    """Crea un nombre de archivo seguro a partir de una URL."""
    return url.replace("https://", "").replace("http://", "").replace("/", "_") + ".txt"

def download_article_content(url):
    """Descarga y extrae el texto plano (h1-h6, p) de una URL."""
    print(f"Descargando contenido de: {url}")
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()  # Lanza un error para respuestas 4xx/5xx

        soup = BeautifulSoup(response.content, 'html.parser')

        # Extraer texto de etiquetas de encabezado y párrafo
        tags = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'])
        if not tags:
            print(f"Advertencia: No se encontraron etiquetas de contenido (h*, p) en {url}.")
            return None
        
        # To add tags to the text: 

        # content_texts = []
        # for tag in tags:
        #     text = tag.get_text(strip=True)
        #     if tag.name.startswith('h'):
        #         # Añadir el nombre de la etiqueta antes del texto para los encabezados
        #         content_texts.append(f"<{tag.name}> {text}")
        #     else:
        #         # Para otros tags como <p>, solo añadir el texto
        #         content_texts.append(text)
        # article_text = "\n\n".join(content_texts)

        # Extraer solo el texto de las etiquetas sin añadir marcas de encabezado
        article_text = "\n\n".join(tag.get_text(strip=True) for tag in tags)

        if not article_text:
            print(f"Advertencia: No se encontró contenido de texto en {url}")
            return None

        # Guardar el contenido descargado en un archivo
        try:
            filename = _get_filename_from_url(url)
            filepath = os.path.join("contenido_descargado", filename)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(article_text)
            print(f"Contenido descargado guardado en: {filepath}")
        except Exception as e:
            print(f"Error al guardar el contenido descargado para {url}: {e}")

        return article_text

    except requests.exceptions.RequestException as e:
        print(f"Error al descargar {url}: {e}")
        return None

def get_claude_response(system_prompt, user_prompt):
    """Envía los prompts a la API de Claude y devuelve la respuesta y el uso de tokens."""
    print("Enviando a la API de Claude...")
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        message = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": user_prompt
                }
            ]
        )

        response_text = message.content[0].text
        usage = message.usage

        return response_text, usage

    except Exception as e:
        print(f"Error al contactar con la API de Claude: {e}")
        return None, None

def calculate_and_print_cost(usage):
    """Calcula y muestra el coste de una llamada a la API basado en el uso de tokens."""
    if not usage:
        return

    input_tokens = usage.input_tokens
    output_tokens = usage.output_tokens

    input_cost = (input_tokens / 1_000_000) * PRICE_INPUT_PER_MILLION_TOKENS
    output_cost = (output_tokens / 1_000_000) * PRICE_OUTPUT_PER_MILLION_TOKENS
    total_cost = input_cost + output_cost

    print("--- Resumen de Coste de API ---")
    print(f"Tokens de Entrada: {input_tokens} (${input_cost:.6f})")
    print(f"Tokens de Salida:  {output_tokens} (${output_cost:.6f})")
    print(f"Coste Total:         ${total_cost:.6f}")
    print("-----------------------------")

def save_claude_log(url, user_prompt, usage):
    """Guarda el prompt enviado a Claude y el coste en un archivo de log."""
    if not usage:
        return

    try:
        filename = _get_filename_from_url(url)
        filepath = os.path.join("logs_claude", filename)

        input_tokens = usage.input_tokens
        output_tokens = usage.output_tokens
        input_cost = (input_tokens / 1_000_000) * PRICE_INPUT_PER_MILLION_TOKENS
        output_cost = (output_tokens / 1_000_000) * PRICE_OUTPUT_PER_MILLION_TOKENS
        total_cost = input_cost + output_cost

        log_content = f"""--- LOG DE LA LLAMADA A CLAUDE PARA: {url} ---

--- USO Y COSTE ---
Tokens de Entrada: {input_tokens} (${input_cost:.6f})
Tokens de Salida:  {output_tokens} (${output_cost:.6f})
Coste Total:         ${total_cost:.6f}

--- PROMPT DE USUARIO ENVIADO ---
{user_prompt}
"""

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(log_content)
        
        print(f"Log de Claude guardado en: {filepath}")

    except Exception as e:
        print(f"Error al guardar el log de Claude para {url}: {e}")

def is_url_processed(line):
    """Check if a line in the markdown file has been processed (has ' - DONE' suffix)."""
    return line.strip().endswith(' - DONE')

def mark_url_as_processed(markdown_file, url):
    """Update the markdown file to mark a URL as processed."""
    try:
        with open(markdown_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Find and update the line containing the URL
        for i, line in enumerate(lines):
            if line.strip().startswith('- ' + url) and not is_url_processed(line):
                lines[i] = f"- {url} - DONE\n"
                break
        
        # Write the updated content back to the file
        with open(markdown_file, 'w', encoding='utf-8') as f:
            f.writelines(lines)
            
    except Exception as e:
        print(f"Error updating markdown file: {e}")

def parse_markdown_structure(markdown_file):
    """Parse the markdown file to build a URL to folder mapping and get unprocessed URLs."""
    url_to_folder = {}
    unprocessed_urls = []
    current_section = ""
    current_subsection = ""
    
    with open(markdown_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.startswith('## '):  # Main section
                current_section = line[3:].strip()
                current_subsection = ""  # Reset subsection when section changes
            elif line.startswith('### '):  # Subsection
                current_subsection = line[4:].strip()
            elif line.startswith('- http'):  # URL
                # Extract URL, removing any existing ' - DONE' suffix
                url = line[2:].strip().split(' - DONE')[0].strip()
                
                # Skip already processed URLs
                if is_url_processed(line):
                    print(f"Skipping already processed URL: {url}")
                    continue
                    
                # Clean up section and subsection names for filesystem
                section_clean = re.sub(r'[^\w\s-]', '', current_section).strip().replace(' ', '_')
                subsection_clean = re.sub(r'[^\w\s-]', '', current_subsection).strip().replace(' ', '_') if current_subsection else ""
                
                # Build the folder path
                folder_parts = ["articulos_procesados", section_clean]
                if subsection_clean:
                    folder_parts.append(subsection_clean)
                    
                url_to_folder[url] = os.path.join(*folder_parts)
                unprocessed_urls.append(url)
    
    return url_to_folder, unprocessed_urls
    
    return url_to_folder

def save_response_to_file(url, response_content, url_to_folder):
    """Guarda el contenido de la respuesta en un archivo de texto con estructura de carpetas."""
    try:
        # Get the folder path for this URL, or use a default folder
        folder_path = url_to_folder.get(url, os.path.join("articulos_procesados", "Uncategorized"))
        
        # Create directory if it doesn't exist
        os.makedirs(folder_path, exist_ok=True)
        
        # Create a safe filename from URL
        domain = urlparse(url).netloc.replace('www.', '').split('.')[0]
        path = urlparse(url).path.strip('/').replace('/', '_')
        filename = f"{domain}_{path}.txt"
        filepath = os.path.join(folder_path, filename)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(response_content)

        print(f"Respuesta guardada en: {filepath}")

    except Exception as e:
        print(f"Error al guardar el archivo para {url}: {e}")

# --- Lógica Principal ---

def main():
    """Función principal que orquesta el proceso."""
    # Crear el directorio de salida si no existe
    os.makedirs("articulos_procesados", exist_ok=True)
    
    print(f"Analizando archivo markdown: {MARKDOWN_FILE}")
    
    # Parsear la estructura del archivo markdown y obtener URLs sin procesar
    url_to_folder, unprocessed_urls = parse_markdown_structure(MARKDOWN_FILE)
    
    if not unprocessed_urls:
        print("No se encontraron URLs sin procesar en el archivo markdown.")
        return
    
    print(f"\nEncontradas {len(unprocessed_urls)} URLs sin procesar.")
    
    # Procesar cada URL sin procesar
    for url in unprocessed_urls:
        print(f"\n---\nProcesando: {url}")
        
        # 1. Descargar el contenido del artículo
        article_content = download_article_content(url)
        if not article_content:
            print(f"No se pudo descargar el contenido de {url}")
            continue
            
        # 2. Crear el prompt de usuario con el contenido del artículo
        user_prompt = USER_PROMPT_TEMPLATE.format(article_content=article_content, url=url)
        
        # 3. Obtener la respuesta de Claude
        print("Enviando solicitud a la API de Claude...")
        response_content, usage = get_claude_response(SYSTEM_PROMPT, user_prompt)
        
        if response_content and usage:
            try:
                # 4. Calcular y mostrar el coste
                calculate_and_print_cost(usage)
                
                # 5. Guardar el log de la conversación
                save_claude_log(url, user_prompt, usage)
                
                # 6. Guardar la respuesta en un archivo con la estructura de carpetas
                save_response_to_file(url, response_content, url_to_folder)
                
                # 7. Marcar la URL como procesada en el archivo markdown
                mark_url_as_processed(MARKDOWN_FILE, url)
                print(f"URL marcada como procesada: {url}")
                
            except Exception as e:
                print(f"Error procesando la URL {url}: {e}")
                # No mark as done if there was an error

    print("\nProceso completado.")

if __name__ == "__main__":
    main()
