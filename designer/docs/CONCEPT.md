# ★★★★★ × PARADOX Designer

**The concept: the customer designs, PARADOX produces.**

A customer opens the PARADOX Designer, chooses a garment and a colour, and composes their own piece from the official PARADOX marks. They see it on a real 3D garment, save it and share it. When they send it to print, PARADOX reviews the order, sends it to the factory and ships it to them, with updates at every step.

The form is locked and the palette is open. Every mark is pre-approved, so every garment that leaves the factory is unmistakably PARADOX. That's the Porsche principle: the same shape in many colours.

---

## 1. Principles

1. **Our branding only.** Customers design with the official ★★★★★ × PARADOX marks and nothing else. Uploading your own logo is a separate, proprietary product. It's visible in the Designer but greyed out: *"a separate PARADOX product, coming soon."*
2. **The mark never changes shape.** Customers change the colour, size, position, angle and number of copies. The mark's proportions, letterforms and spacing are fixed. Stars and × are set in Graphik; PARADOX is set in Canela.
3. **It must look real.** The garment is a true 3D object that can be turned, zoomed and inspected. What the customer sees is what the factory makes.
4. **Never lose work.** Customers can save as many designs as they like. Backing out with unsaved changes always asks first.
5. **The specification is the product.** Every design produces exact, factory-ready measurements, so production never has to guess.
6. **Five-star pricing.** Prices are distinctive and all end in 5, for the five stars:

| Garment | Price |
|---|---|
| T-shirt | £55 |
| Long sleeve | £75 |
| Hoodie | £95 |

---

## 2. The customer journey

```
Garment screen ──► DESIGN YOUR LOGO ──► Logo Designer ──► OK! ──► Garment screen ──► Save / Share ──► Send to print
      ▲                                     │                                                               │
      └──────────── Custom placement ───────┘                                                               ▼
                                                                          PARADOX review ──► Factory ──► Shipped ──► Customer
```

### 2.1 The garment screen

- A realistic 3D garment that the customer can rotate, zoom and view from the front, side or back. It turns slowly on arrival.
- **Garment:** T-shirt, long sleeve or hoodie.
- **Fabric colour:** the house palette (black, white, charcoal, deep violet, violet, lavender, EVA green, Akira red) or any colour.
- **Logo style:** six favourite styles, including DIAGONAL · パラドックス, with "All 19 styles" opening the Designer.
- **Logos on this garment:** a garment can carry several logos, on the front and the back.
- **Placement:** Down the chest · Left chest · Sleeve · Full back · **Custom…**, which opens the Designer.
- **Width, angle and method** (screen print or embroidery).
- **Drag on the 3D garment itself:** grab a logo and slide it anywhere on the fabric, including round to the back.
- **"DESIGN YOUR LOGO":** a big, wide pill button with semicircle ends and a deep-purple gradient, directly above the hint text under the garment.

### 2.2 The Logo Designer

The Logo Designer is the logo-experiments tool, rebuilt as a **standalone, reusable designer**. It is used here for garments, and the same functionality can be used elsewhere (posters, packaging, the 零 pen barrel).

- The customer works on a straight-on view of their actual garment, front or back, with the print area marked.
- **Move:** drag a logo. It snaps to the centre line.
- **Spin and size:** hold the circle at the corner, the logo-experiments grip. Mouse wheel and pinch also resize.
- **Variations:** ‹ › to step through all 19 official marks, or ALL 19 for the full sheet.
- **Copies:** −/+ repeats the mark in a line, as in logo-experiments.
- **Ink:** the brand palette.
- **Add, duplicate, centre, move to back, delete, undo and redo.**
- **My designs:** name a design, save it, open it later and keep as many as you like.
- **Leaving with unsaved changes** asks: *Save · Discard · Keep designing.*
- **OK!** saves the design and returns to the garment screen, with the design on the 3D garment.

### 2.3 Save, share, send to print

- **Save** stores the design in the customer's designs.
- **Share** creates a link that opens straight to that design. The recipient can change it and save it as their own.
- **Send to print:** size (XS to XXL), quantity, *"Who gets the gear?"* and a delivery note.

> Once complete, we will review your order, send it to the factory, and ship it to you as soon as possible. We'll keep you updated every step of the way.

---

## 3. The official marks (19)

| Family | Variations |
|---|---|
| Bracket (the true logo) | `[★★★★★× / PARADOX]`, plus ™ and ® |
| Horizontal | ★★★★★ × PARADOX · ★★★★★ × パラドックス |
| Vertical, Latin | PARADOX, PARADOX 2, PARADOX ™, PARADOX ®, PARADOX stacked, stacked ™, stacked ® |
| Vertical, katakana | パラドックス · パラドックス 2 · パラドックス 3 |
| Stacked, katakana | パラドックス · パラドックス 2 |
| Diagonal | DIAGONAL · パラドックス: seven vertical パラドックス marks cut across the garment at 33.2°. Born in the Designer on 21 October 2026, and kept. |
| Mark | ★ |

**The example design for spec and promo material** is DIAGONAL · パラドックス in silver on a black hoodie, sweeping across the chest and over the shoulder in three dimensions (see `docs/example-diagonal.png`).

The default design is a **black hoodie with the vertical ★★★★★ × パラドックス in white**, running down the chest. Japanese is written vertically, so the katakana mark reads naturally.

**Inks:** white, black, silver, lavender, violet, deep violet, EVA green and Akira red.

---

## 4. What production receives

Every order carries a full print specification, with one entry per logo:

| Field | Example |
|---|---|
| Garment, size, quantity | Hoodie · M · 1 |
| Fabric | Black |
| Method | Screen print / Embroidery |
| Side | Front / Back |
| Logo style | DIAGONAL · パラドックス |
| Ink | White |
| Print size | 10.0 × 31.0 cm |
| Position | Centred, top edge 9.5 cm below the collar |
| Angle, copies | 0°, ×1 |
| Price | £95 × quantity |

**Production rules:**

- Measurements are taken on a size M and scaled by the factory for other sizes.
- Embroidery needs letters at least 5 mm tall. The Designer warns the customer before they order.
- Print areas: front 32 × 50 cm, back 34 × 54 cm. On a hoodie, the front print stops above the pocket and the back print starts below the hood.
- The artwork is the official vector file for that mark, in the chosen ink. It is never redrawn.

**The production queue** (owner only) lists every order with its full specification and status: received → reviewed → at the factory → shipped.

---

## 5. Roadmap

0. **Undo and redo on the garment screen:** Cmd+Z undoes an accidental tweak and Cmd+Y redoes it.

1. **Factory link:** send approved orders straight to the print partner, with status updates flowing back to the customer.
2. **Payment** at checkout.
3. **Custom logos:** the separate, proprietary product, unlocking the greyed-out upload.
4. **More garments:** caps, jackets and totes, using the same designer.
5. **Designer everywhere:** the same Logo Designer for posters, packaging and the 零 pen barrel.
6. **The voting loop:** logo-experiments votes surface the customers' favourite colourways.

---

★★★★★ × PARADOX™ is a trademark of PARADOXICA Ltd., a company registered in England and Wales, company no. 17145296.
