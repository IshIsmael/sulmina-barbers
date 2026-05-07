# UI/UX Design Documentation — Sulmina Barbers

## 1. Design Philosophy: "The Cinematic Editorial"
The website is designed to feel like a high-end digital magazine. It prioritizes storytelling, craftsmanship, and a "Modern Heritage" aesthetic. The goal is to move away from standard business templates and toward a bespoke, brand-led experience that signals premium quality through intentional asymmetry, textural depth, and high-contrast typography.

---

## 2. Global Visual Foundations

### The "Ink & Paper" Palette
*   **Ink (Base):** A deep, near-black Forest Green. Used for primary backgrounds and high-contrast headers. It provides a sense of luxury, depth, and "quiet luxury."
*   **Paper (Surface):** A warm, textured Bone color used for main reading areas. This reduces eye strain compared to stark white and creates a "hand-crafted" paper feel.
*   **Metallic Brass (Accent):** A refined gold tone used sparingly for highlights, "eyebrows" (labels), and interactive calls-to-action. It signals prestige and precision.

### Typography Hierarchy
*   **Character Headlines (Serif):** Uses 'Fraunces' with a tight, architectural spacing. Most headlines are intentionally lowercase to feel modern and "low-ego."
*   **Precision Body (Sans-Serif):** Uses 'Manrope' for technical details and descriptions. It is spaced generously to ensure clarity and a premium, modern-tech feel.
*   **Micro-Typography:** Small, vertical, and wide-spaced uppercase labels (e.g., "EST. 2026") are used as decorative textures to fill negative space.

### Tactile Textures & Momentum
*   **Digital Grain:** A global, very subtle film grain overlay is applied to the entire site. This removes the "plastic" feel of digital screens and adds a physical, premium weight to every section.
*   **Animation Momentum (The "Weighted Glide"):** 
    *   *The Feel:* Elements should never "snap" or "pop" into place. Instead, they glide with "momentum"—starting slow, accelerating smoothly, and coming to a heavy, graceful stop (Exponential Easing).
    *   *The Reveal:* When a user scrolls or opens a menu, text and images should use a "Reveal" effect (e.g., sliding up 10 pixels while fading in). This makes the content feel like it is being "presented" rather than just appearing.
    *   *Interactive Haptics:* Buttons and links should react with a "lift" (moving up 2-4 pixels) rather than just changing color. This signals that the element is "active" and responsive to the user's touch.
*   **Architectural Edges:** Buttons and containers use sharp, 90-degree corners. This avoids the "bubbly" look of basic sites and feels more like premium stationery or architecture.

---

## 3. Global Navigation & Shell

### The "Glassmorphism" Header
*   A fixed navigation bar that uses a high-clarity frosted glass effect. As you scroll, the content behind the header blurs beautifully, creating a sense of depth and transparency.
*   **Safety Rule (The "Safe Zone"):** The header must remain perfectly balanced. It should never be so large that it consumes more than 10-15% of the screen height, ensuring the actual content has room to shine.

### Editorial Mobile Menu
*   **The Solid Overlay:** To avoid the "clash" of overlapping text, the mobile menu must have a 100% solid background (Ink). It acts as a total takeover of the screen.
*   It uses massive, lowercase editorial typography for navigation links. These links should "shift" slightly to the right when tapped, providing instant visual feedback.

---

## 4. Layout Standards: What to Ensure vs. Avoid

### "Air with Intent" (Spacing)
*   **DO:** Use large vertical margins (white space) to separate major sections. This creates a sense of luxury and calm.
*   **AVOID:** "Excessive Bloat." If a section only contains a single line of text or a small icon, it should NOT have massive padding that requires the user to scroll through a "void." Spacing must be proportional to the importance of the content.
*   **The Content Density Rule:** While the design is "Editorial," information must still be easy to find. Group related items (like hours or contact rows) into tight, logical clusters within the larger asymmetric layout.

### Functional Visibility Safety
*   **The "Navbar Trap" Prevention:** Elements that are interactive (like the "Time Selection" pills in the booking flow) must NEVER slide underneath the fixed header and become unreachable. 
    *   *The Fix:* Use a "Safe Zone" padding at the top of every main content section that matches the height of the header.
*   **Z-Index Hierarchy:** 
    1.  *Top Layer:* The Mobile Menu Toggle (Always accessible).
    2.  *Second Layer:* The Glassmorphism Header (Fixed at top).
    3.  *Third Layer:* Floating Action Buttons (CTAs).
    4.  *Base Layer:* Page content and imagery.

---

## 5. Page-Specific Layouts

### Home Page: The Brand Entrance
*   **Cinematic Hero:** An asymmetric split-screen experience. One side features a massive serif headline, while the other features a portrait-oriented image with a custom "editorial cut" (asymmetric shape).
*   **Asymmetric Story Section:** Text and imagery are staggered and overlapped. The shop’s name floats in the background as a giant, translucent watermark, creating a "layered" magazine spread look.
*   **House Specialities (Lookbook):** Services are presented in a clean, vertical list where prices float to the right. On hover, the rows highlight subtly with a brass glow.
*   **Editorial Contact Strip:** A balanced 3-column grid at the bottom of the page that provides a seamless, high-contrast transition into the footer.

### Services Page: The Menu of Craft
*   **Bento Grouping:** Services are organized into clean, modular groups with lowercase titles.
*   **Transparency:** Every service includes an honest duration and a fixed price. The layout uses "zebra-striping" (alternating subtle tints) to make the list easy to read on mobile.
*   **Interactive Reveals:** Hovering over a service reveals more detail and moves the price slightly, signaling that the slot is "ready to book."

### About Page: Meet the Team
*   **Staggered Portraiture:** Images of the barbers and the shop floor are different sizes and staggered down the page to break the grid.
*   **Owner’s Voice:** Text blocks are placed in the "white space" between images, using large margins to create a sense of calm and luxury.

### Gallery: The Craft Portfolio
*   **Broken Grid:** Images use varying aspect ratios (tall, wide, and square) arranged in a "random-but-balanced" layout. This prevents the gallery from looking like a social media feed and makes it look like a curated portfolio.

### Contact Page: High-Clarity Find
*   **Monochromatic Map:** The Google Map is customized with a grayscale finish to match the premium palette.
*   **Information Rows:** Key contact details are presented with massive, high-contrast typography for instant readability.

---

## 5. User Experience (UX) Principles

*   **Frictionless Booking:** The "Book" button is always accessible but never intrusive. It is a persistent call-to-action that guides the user to a step-by-step, app-like booking flow.
*   **Thumb-Friendly Mobile:** All interactive elements (pills, slots, buttons) are sized for easy tapping. Horizontal scrolling is used for calendars to maximize screen space.
*   **Visual Hierarchy:** The design uses size and contrast (Brass on Ink) to guide the user's eye to the most important actions first.
*   **Seamless Transitions:** Every page transition and menu opening is designed to feel like a "reveal," maintaining the cinematic atmosphere throughout the journey.
