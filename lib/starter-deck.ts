import type { Client } from "@libsql/client";
import { createEmptyCard } from "ts-fsrs";

// A small high-yield starter set, added once to a fresh database. Fields use
// the card markup from lib/markup.ts (**bold**, x^{2}, H_{2}O).
// [front, back, topic id]
type Seed = { name: string; section: string; description: string; cards: [string, string, string][] };

const AMINO: [string, string, string][] = (
  [
    ["G", "Glycine (Gly)", "nonpolar; H side chain, the only achiral amino acid"],
    ["A", "Alanine (Ala)", "nonpolar, aliphatic (methyl)"],
    ["V", "Valine (Val)", "nonpolar, aliphatic, branched"],
    ["L", "Leucine (Leu)", "nonpolar, aliphatic, branched"],
    ["I", "Isoleucine (Ile)", "nonpolar, aliphatic, branched; two chiral carbons"],
    ["M", "Methionine (Met)", "nonpolar, contains sulfur (thioether); start codon AUG"],
    ["P", "Proline (Pro)", "nonpolar; cyclic secondary amine, breaks α-helices"],
    ["F", "Phenylalanine (Phe)", "nonpolar, aromatic (benzyl)"],
    ["W", "Tryptophan (Trp)", "nonpolar, aromatic (indole); absorbs at 280 nm"],
    ["S", "Serine (Ser)", "polar (–OH); a phosphorylation site"],
    ["T", "Threonine (Thr)", "polar (–OH); a phosphorylation site"],
    ["C", "Cysteine (Cys)", "polar (thiol, –SH); forms disulfide bonds"],
    ["Y", "Tyrosine (Tyr)", "polar, aromatic (phenol –OH); a phosphorylation site"],
    ["N", "Asparagine (Asn)", "polar, amide; site of N-linked glycosylation"],
    ["Q", "Glutamine (Gln)", "polar, amide"],
    ["D", "Aspartate (Asp)", "acidic, negatively charged at pH 7"],
    ["E", "Glutamate (Glu)", "acidic, negatively charged at pH 7"],
    ["K", "Lysine (Lys)", "basic, positively charged at pH 7"],
    ["R", "Arginine (Arg)", "basic (guanidinium), positively charged at pH 7"],
    ["H", "Histidine (His)", "basic (imidazole, side-chain pKa ≈ 6); often in enzyme active sites"],
  ] as const
).map(([one, name, kind]) => [`Amino acid with one-letter code **${one}**`, `${name} — ${kind}`, "1A.1"]);

export const STARTER_DECKS: Seed[] = [
  {
    name: "Starter · Amino acids",
    section: "bb",
    description: "The 20 amino acids and their key acid–base facts.",
    cards: [
      ...AMINO,
      ["Approximate pK_{a} of the α-carboxyl and α-amino groups", "α-COOH ≈ 2; α-NH_{3}^{+} ≈ 9–10", "1A.1"],
      ["Isoelectric point (pI) of an amino acid with a neutral side chain", "The average of the α-carboxyl and α-amino pK_{a} values (≈ 6)", "1A.1"],
      ["At a pH below an amino acid's pI, its net charge is…", "Positive (more protonated)", "1A.1"],
      ["Which amino acids are acidic? Which are basic?", "Acidic: Asp, Glu. Basic: Lys, Arg, His", "1A.1"],
      ["Which amino acids contain sulfur?", "Cysteine and methionine", "1A.1"],
      ["Which bond holds together the primary structure of a protein?", "Peptide (amide) bonds", "1A.2"],
      ["Which interactions stabilize secondary structure (α-helix, β-sheet)?", "Hydrogen bonds between backbone C=O and N–H groups", "1A.2"],
    ],
  },
  {
    name: "Starter · Physics & general chemistry",
    section: "cp",
    description: "Equations and rules to know cold for C/P.",
    cards: [
      ["Kinematics: final velocity with constant acceleration", "v = v_{0} + at", "4A.2"],
      ["Kinematics: displacement with constant acceleration", "Δx = v_{0}t + ½at^{2}", "4A.2"],
      ["Kinematics: velocity–displacement equation (no time)", "v^{2} = v_{0}^{2} + 2aΔx", "4A.2"],
      ["Force of gravity along / perpendicular to an incline of angle θ", "Along: mg sin θ. Normal force: mg cos θ", "4A.3"],
      ["Kinetic friction force", "f_{k} = μ_{k}N", "4A.3"],
      ["Torque", "τ = rF sin θ", "4A.4"],
      ["Work done by a constant force", "W = Fd cos θ", "4A.5"],
      ["Kinetic energy; gravitational PE; spring PE", "KE = ½mv^{2}; PE = mgh; PE_{spring} = ½kx^{2}", "4A.5"],
      ["Impulse", "J = FΔt = Δp (change in momentum)", "4A.6"],
      ["Centripetal acceleration", "a_{c} = v^{2}/r", "4A.3"],
      ["Hydrostatic (gauge + atmospheric) pressure at depth h", "P = P_{0} + ρgh", "4B.1"],
      ["Buoyant force", "F_{B} = ρ_{fluid} V_{submerged} g", "4B.1"],
      ["Continuity equation", "A_{1}v_{1} = A_{2}v_{2} — narrower pipe, faster flow", "4B.2"],
      ["Bernoulli's equation", "P + ½ρv^{2} + ρgh = constant (faster flow → lower pressure)", "4B.2"],
      ["Poiseuille's law: how flow rate depends on vessel radius", "Q = πr^{4}ΔP / (8ηL) — flow ∝ r^{4}", "4B.2"],
      ["Ideal gas law; volume of 1 mol of ideal gas at STP", "PV = nRT; 22.4 L at 0 °C and 1 atm", "4B.3"],
      ["Coulomb's law", "F = kq_{1}q_{2}/r^{2}", "4C.1"],
      ["Electric potential of a point charge; potential energy of two charges", "V = kQ/r; U = kq_{1}q_{2}/r", "4C.2"],
      ["Ohm's law and electrical power", "V = IR; P = IV = I^{2}R = V^{2}/R", "4C.3"],
      ["Resistors in series vs parallel", "Series: R = R_{1} + R_{2} + …. Parallel: 1/R = 1/R_{1} + 1/R_{2} + …", "4C.3"],
      ["Capacitors in series vs parallel", "Parallel: C = C_{1} + C_{2} + …. Series: 1/C = 1/C_{1} + 1/C_{2} + …", "4C.2"],
      ["Capacitance of a parallel-plate capacitor; energy stored", "C = ε_{0}A/d (×κ with a dielectric); U = ½CV^{2}", "4C.2"],
      ["Resistance of a wire", "R = ρL/A", "4C.3"],
      ["Galvanic cell: sign of E°_{cell} and ΔG; charge of the anode", "E°_{cell} > 0, ΔG < 0; anode is negative (oxidation always at the anode)", "4C.5"],
      ["Electrolytic cell: sign of E°_{cell} and ΔG; charge of the anode", "E°_{cell} < 0, ΔG > 0; anode is positive", "4C.5"],
      ["Nernst equation at 25 °C", "E = E° − (0.0592/n) log Q", "4C.6"],
      ["Wave speed; photon energy", "v = fλ; E = hf = hc/λ", "4D.2"],
      ["Sound level in decibels", "β = 10 log(I/I_{0}); ×10 intensity = +10 dB", "4D.1"],
      ["Thin lens / mirror equation; magnification", "1/f = 1/d_{o} + 1/d_{i}; m = −d_{i}/d_{o}", "4D.3"],
      ["Focal length of a spherical mirror; lens power", "f = R/2; P = 1/f (diopters, f in meters)", "4D.3"],
      ["Snell's law; index of refraction", "n_{1} sin θ_{1} = n_{2} sin θ_{2}; n = c/v", "4D.3"],
      ["Doppler effect: source and observer moving toward each other", "Observed frequency is higher than emitted", "4D.1"],
      ["Change in mass and atomic number: α decay, β^{−} decay, β^{+} decay, γ decay", "α: A −4, Z −2. β^{−}: Z +1. β^{+}: Z −1. γ: no change", "4E.3"],
      ["Amount remaining after n half-lives", "N = N_{0}(½)^{n}", "4E.3"],
      ["Henderson–Hasselbalch equation", "pH = pK_{a} + log([A^{−}]/[HA])", "5A.2"],
      ["K_{w} and pH + pOH at 25 °C", "K_{w} = 10^{−14}; pH + pOH = 14", "5A.1"],
      ["Freezing point depression; boiling point elevation; osmotic pressure", "ΔT_{f} = iK_{f}m; ΔT_{b} = iK_{b}m; Π = iMRT", "5A.4"],
      ["Gibbs free energy", "ΔG = ΔH − TΔS", "5E.1"],
      ["Relationships between ΔG°, K and E°", "ΔG° = −RT ln K = −nFE°", "5E.1"],
      ["Heat absorbed with a temperature change", "q = mcΔT", "5E.2"],
      ["What does a catalyst change?", "Lowers activation energy, speeding both directions; does not change ΔG, ΔH or K", "5E.3"],
    ],
  },
  {
    name: "Starter · Biochemistry",
    section: "bb",
    description: "Metabolism, enzyme kinetics and molecular biology essentials.",
    cards: [
      ["Net yield of glycolysis per glucose", "2 pyruvate, 2 ATP, 2 NADH", "1D.3"],
      ["Rate-limiting enzyme of glycolysis", "Phosphofructokinase-1 (PFK-1)", "1D.3"],
      ["Rate-limiting enzyme of gluconeogenesis", "Fructose-1,6-bisphosphatase", "1D.3"],
      ["Rate-limiting enzyme of the citric acid cycle", "Isocitrate dehydrogenase", "1D.4"],
      ["Rate-limiting enzyme of the pentose phosphate pathway, and its products", "Glucose-6-phosphate dehydrogenase; makes NADPH and ribose-5-phosphate", "1D.3"],
      ["Rate-limiting enzymes of glycogen synthesis and breakdown", "Glycogen synthase; glycogen phosphorylase", "1D.6"],
      ["Rate-limiting enzyme of fatty acid synthesis", "Acetyl-CoA carboxylase", "1D.7"],
      ["Rate-limiting step of β-oxidation", "Carnitine acyltransferase I (CPT-1), moving fatty acids into the mitochondrion", "1D.7"],
      ["Rate-limiting enzyme of cholesterol synthesis", "HMG-CoA reductase", "1D.7"],
      ["Rate-limiting enzyme of the urea cycle", "Carbamoyl phosphate synthetase I", "1D.8"],
      ["Products of one turn of the citric acid cycle (per acetyl-CoA)", "3 NADH, 1 FADH_{2}, 1 GTP, 2 CO_{2}", "1D.4"],
      ["Final electron acceptor of the electron transport chain", "O_{2} (reduced to H_{2}O at complex IV)", "1D.5"],
      ["Which ETC complex is also a citric acid cycle enzyme and pumps no protons?", "Complex II — succinate dehydrogenase", "1D.5"],
      ["Direction of proton flow through ATP synthase", "From the intermembrane space into the matrix, down its gradient", "1D.5"],
      ["Definition of K_{m}", "The substrate concentration at which v = ½V_{max}", "1A.6"],
      ["Lineweaver–Burk intercepts", "y-intercept = 1/V_{max}; x-intercept = −1/K_{m}", "1A.6"],
      ["Competitive inhibition: effect on K_{m} and V_{max}", "K_{m} ↑, V_{max} unchanged (overcome by more substrate)", "1A.7"],
      ["Noncompetitive inhibition: effect on K_{m} and V_{max}", "V_{max} ↓, K_{m} unchanged", "1A.7"],
      ["Uncompetitive inhibition: effect on K_{m} and V_{max}", "Both decrease (binds only the enzyme–substrate complex)", "1A.7"],
      ["What shifts the oxyhemoglobin dissociation curve to the right?", "↑ CO_{2}, ↑ H^{+} (↓ pH), ↑ temperature, ↑ 2,3-BPG", "3B.2"],
      ["Direction of DNA and RNA synthesis", "5′ → 3′ (template read 3′ → 5′)", "1B.2"],
      ["Start codon; stop codons", "AUG (methionine); UAA, UAG, UGA", "1B.3"],
      ["Which eukaryotic RNA polymerase makes mRNA?", "RNA polymerase II", "1B.3"],
      ["Hardy–Weinberg equations", "p + q = 1; p^{2} + 2pq + q^{2} = 1", "1C.5"],
      ["Hardy–Weinberg assumptions", "Large population, random mating, no mutation, no migration, no natural selection", "1C.5"],
    ],
  },
  {
    name: "Starter · Psych/Soc",
    section: "ps",
    description: "High-yield terms for P/S.",
    cards: [
      ["Weber's law", "The just-noticeable difference is a constant proportion of the original stimulus", "6A.1"],
      ["Signal detection theory: the four outcomes", "Hit, miss, false alarm, correct rejection", "6A.1"],
      ["Bottom-up vs top-down processing", "Bottom-up: built from sensory data. Top-down: driven by expectations and prior knowledge", "6B.1"],
      ["Piaget's four stages, in order", "Sensorimotor (0–2), preoperational (2–7), concrete operational (7–11), formal operational (11+)", "6B.3"],
      ["Object permanence develops in which Piaget stage?", "Sensorimotor", "6B.3"],
      ["Conservation is mastered in which Piaget stage?", "Concrete operational", "6B.3"],
      ["Sleep stage with delta waves", "N3 (slow-wave sleep)", "6B.4"],
      ["Features of REM sleep", "Dreaming, muscle atonia, EEG resembling wakefulness (beta-like)", "6B.4"],
      ["Explicit (declarative) vs implicit memory", "Explicit: episodic and semantic. Implicit: procedural memory and priming", "6B.5"],
      ["Proactive vs retroactive interference", "Proactive: old info disrupts new. Retroactive: new info disrupts old", "6B.5"],
      ["James–Lange theory of emotion", "Physiological arousal comes first; the emotion follows from perceiving it", "6C.1"],
      ["Cannon–Bard theory of emotion", "Physiological arousal and the emotion occur simultaneously", "6C.1"],
      ["Schachter–Singer (two-factor) theory", "Emotion = physiological arousal + a cognitive label for it", "6C.1"],
      ["Yerkes–Dodson law", "Performance peaks at a moderate level of arousal", "7A.4"],
      ["Maslow's hierarchy, bottom to top", "Physiological, safety, love/belonging, esteem, self-actualization", "7A.4"],
      ["Social facilitation", "Performing better on simple tasks (worse on hard ones) when others are present", "7B.1"],
      ["Social loafing", "Putting in less effort when working in a group", "7B.1"],
      ["Deindividuation", "Losing self-awareness and restraint in a group, often with anonymity", "7B.1"],
      ["Groupthink vs group polarization", "Groupthink: harmony over critical thinking. Polarization: discussion pushes views to extremes", "7B.1"],
      ["Bystander effect", "Each person is less likely to help when more people are present", "7B.1"],
      ["Positive vs negative reinforcement", "Both increase a behavior. Positive adds a pleasant stimulus; negative removes an aversive one", "7C.1"],
      ["Positive vs negative punishment", "Both decrease a behavior. Positive adds an aversive stimulus; negative removes a pleasant one", "7C.1"],
      ["Which reinforcement schedule is most resistant to extinction?", "Variable-ratio", "7C.1"],
      ["Elaboration likelihood model: the two routes", "Central (argument quality, high motivation) and peripheral (superficial cues)", "7C.3"],
      ["Cognitive dissonance", "Discomfort from holding conflicting beliefs or actions, motivating a change to reduce it", "7C.3"],
      ["Fundamental attribution error", "Overweighting dispositional (internal) causes when explaining others' behavior", "8B.1"],
      ["Actor–observer bias", "Attributing your own behavior to the situation, but others' behavior to their disposition", "8B.1"],
      ["Self-serving bias", "Crediting successes to yourself and blaming failures on the situation", "8B.1"],
      ["Stereotype threat", "Worry about confirming a negative stereotype about one's group, which harms performance", "8B.2"],
      ["Functionalism vs conflict theory vs symbolic interactionism", "Functionalism: parts maintain stability. Conflict: competition for scarce resources. Symbolic interactionism: meaning from everyday interaction", "9A.1"],
      ["Intergenerational vs intragenerational mobility", "Intergenerational: change in status relative to parents. Intragenerational: within one's own lifetime", "10A.2"],
    ],
  },
];

/** Adds the starter decks to an empty database, once. */
export async function seedStarterDeck(db: Client) {
  const done = await db.execute("SELECT 1 FROM settings WHERE key = '_seeded'");
  if (done.rows.length) return;
  const decks = await db.execute("SELECT COUNT(*) AS n FROM decks");
  if (Number(decks.rows[0].n) === 0) {
    const c = createEmptyCard(new Date());
    for (const d of STARTER_DECKS) {
      const rs = await db.execute({
        sql: "INSERT INTO decks (name, section, description) VALUES (?, ?, ?) RETURNING id",
        args: [d.name, d.section, d.description],
      });
      const deckId = Number(rs.rows[0].id);
      await db.batch(
        d.cards.map(([front, back, topic]) => ({
          sql: `INSERT INTO cards (deck_id, kind, front, back, topic_id, tags, due, state) VALUES (?, 'basic', ?, ?, ?, 'starter', ?, 0)`,
          args: [deckId, front, back, topic, c.due.toISOString()],
        })),
        "write"
      );
    }
  }
  await db.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('_seeded', 'true')");
}
