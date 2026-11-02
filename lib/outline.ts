import type { SectionId } from "./sections";

// The AAMC MCAT content outline: foundational concepts → content categories
// (ids like "1A", as the AAMC numbers them) → topics within each category
// (ids like "1A.3"). Topics are what get rated, planned and tagged on cards.

export type Topic = { id: string; name: string };
export type Category = { id: string; section: SectionId; name: string; topics: Topic[] };

function cat(id: string, section: SectionId, name: string, topics: string[]): Category {
  return { id, section, name, topics: topics.map((t, i) => ({ id: `${id}.${i + 1}`, name: t })) };
}

export const OUTLINE: Category[] = [
  // ── Biological and Biochemical Foundations of Living Systems ──
  cat("1A", "bb", "Structure and function of proteins and their constituent amino acids", [
    "Amino acids: structure, classification, acid–base behavior",
    "Peptide bonds and protein structure (1°–4°)",
    "Protein folding, denaturation and the hydrophobic effect",
    "Non-enzymatic protein function (binding, motors, immune)",
    "Enzyme function and classification",
    "Enzyme kinetics (Michaelis–Menten, Lineweaver–Burk)",
    "Enzyme inhibition and regulation",
  ]),
  cat("1B", "bb", "Transmission of genetic information from the gene to the protein", [
    "Nucleic acid structure and function",
    "DNA replication and repair",
    "Genetic code and transcription",
    "Translation",
    "Eukaryotic chromosome organization",
    "Control of gene expression (prokaryotes and eukaryotes)",
    "Recombinant DNA and biotechnology",
  ]),
  cat("1C", "bb", "Transmission of heritable information and processes that increase genetic diversity", [
    "Mendelian genetics and inheritance patterns",
    "Meiosis and genetic variability",
    "Mutation types and consequences",
    "Linkage, recombination and gene mapping",
    "Population genetics and Hardy–Weinberg",
    "Evolution and natural selection",
  ]),
  cat("1D", "bb", "Principles of bioenergetics and fuel molecule metabolism", [
    "Bioenergetics, ΔG and ATP",
    "Carbohydrate structure and function",
    "Glycolysis, gluconeogenesis and the pentose phosphate pathway",
    "Pyruvate dehydrogenase and the citric acid cycle",
    "Electron transport chain and oxidative phosphorylation",
    "Glycogen metabolism",
    "Lipid metabolism (fatty acid synthesis and β-oxidation, ketone bodies)",
    "Protein and amino acid metabolism, urea cycle",
    "Hormonal regulation and integration of metabolism",
  ]),
  cat("2A", "bb", "Assemblies of molecules, cells and groups of cells", [
    "Plasma membrane composition and transport",
    "Membrane potential and channels",
    "Membrane-bound organelles",
    "Cytoskeleton",
    "Tissues: epithelial and connective",
  ]),
  cat("2B", "bb", "Structure, growth, physiology and genetics of prokaryotes and viruses", [
    "Prokaryotic cell structure and classification",
    "Bacterial growth and physiology",
    "Bacterial genetics (transformation, conjugation, transduction)",
    "Virus structure and life cycles",
    "Prions and viroids",
  ]),
  cat("2C", "bb", "Processes of cell division, differentiation and specialization", [
    "Mitosis and the cell cycle",
    "Cell cycle control and cancer",
    "Reproductive system and gametogenesis",
    "Embryogenesis and development",
    "Cell differentiation, stem cells and apoptosis",
  ]),
  cat("3A", "bb", "Nervous and endocrine systems", [
    "Neuron structure and action potentials",
    "Synaptic transmission and neurotransmitters",
    "Organization of the nervous system (CNS, PNS, autonomic)",
    "Sensory receptors and reflexes",
    "Endocrine glands and hormones",
    "Hormone mechanisms (peptide vs steroid) and feedback",
  ]),
  cat("3B", "bb", "Structure and integrative functions of the main organ systems", [
    "Respiratory system",
    "Circulatory system and blood",
    "Lymphatic and immune systems",
    "Digestive system and accessory organs",
    "Excretory system and the nephron",
    "Musculoskeletal system and muscle contraction",
    "Skin and thermoregulation",
  ]),

  // ── Chemical and Physical Foundations of Biological Systems ──
  cat("4A", "cp", "Translational motion, forces, work, energy and equilibrium", [
    "Units, dimensions and vectors",
    "Kinematics and projectile motion",
    "Newton's laws, friction and inclined planes",
    "Torque and equilibrium",
    "Work, energy and power",
    "Momentum and collisions",
    "Periodic motion",
  ]),
  cat("4B", "cp", "Fluids in circulation, gas movement and gas exchange", [
    "Density, pressure and buoyancy",
    "Fluid dynamics (continuity, Bernoulli, Poiseuille)",
    "Gas laws and kinetic molecular theory",
    "Partial pressure and gas exchange",
  ]),
  cat("4C", "cp", "Electrochemistry and electrical circuits", [
    "Electrostatics, Coulomb's law and electric fields",
    "Electric potential and capacitance",
    "Circuits: Ohm's law, resistors in series and parallel",
    "Magnetism",
    "Electrochemical cells (galvanic, electrolytic, concentration)",
    "Nernst equation and specialized cells",
  ]),
  cat("4D", "cp", "How light and sound interact with matter", [
    "Sound: waves, intensity, Doppler effect",
    "Electromagnetic spectrum and light",
    "Geometric optics: mirrors and lenses",
    "Interference, diffraction and polarization",
    "Spectroscopy (IR, UV-Vis, NMR, mass spec)",
  ]),
  cat("4E", "cp", "Atoms, nuclear decay, electronic structure and atomic behavior", [
    "Atomic structure and quantum numbers",
    "Electron configuration and the Bohr model",
    "Nuclear decay and half-life",
    "Periodic trends",
    "Stoichiometry and reaction types",
  ]),
  cat("5A", "cp", "Unique nature of water and its solutions", [
    "Acids and bases, pH and pKa",
    "Buffers and titrations",
    "Solubility, Ksp and the common ion effect",
    "Colligative properties",
  ]),
  cat("5B", "cp", "Nature of molecules and intermolecular interactions", [
    "Covalent bonding, Lewis structures and formal charge",
    "VSEPR, hybridization and polarity",
    "Intermolecular forces",
    "Stereochemistry and isomerism",
  ]),
  cat("5C", "cp", "Separation and purification methods", [
    "Extraction and distillation",
    "Chromatography",
    "Electrophoresis and protein purification",
  ]),
  cat("5D", "cp", "Structure, function and reactivity of biologically relevant molecules", [
    "Nomenclature and functional groups",
    "Alcohols and phenols",
    "Aldehydes and ketones",
    "Carboxylic acids and derivatives",
    "Nitrogen- and phosphorus-containing compounds",
    "Lipids, carbohydrates and nucleotides (chemistry)",
    "Nucleophiles, electrophiles, SN1/SN2 and redox",
  ]),
  cat("5E", "cp", "Principles of chemical thermodynamics and kinetics", [
    "Thermodynamics: enthalpy, entropy, Gibbs free energy",
    "Calorimetry and heat transfer",
    "Reaction kinetics and rate laws",
    "Chemical equilibrium and Le Châtelier's principle",
  ]),

  // ── Psychological, Social and Biological Foundations of Behavior ──
  cat("6A", "ps", "Sensing the environment", [
    "Sensory processing, thresholds and signal detection",
    "Vision",
    "Hearing and vestibular sense",
    "Somatosensation, taste and smell",
  ]),
  cat("6B", "ps", "Making sense of the environment", [
    "Perception and Gestalt principles",
    "Attention",
    "Cognition and cognitive development (Piaget)",
    "Consciousness, sleep and altered states",
    "Memory: encoding, storage, retrieval",
    "Language",
  ]),
  cat("6C", "ps", "Responding to the world", [
    "Emotion: components and theories",
    "Stress and coping",
  ]),
  cat("7A", "ps", "Individual influences on behavior", [
    "Biological bases of behavior (nervous system, genetics)",
    "Personality theories",
    "Psychological disorders",
    "Motivation and drives",
    "Attitudes",
  ]),
  cat("7B", "ps", "Social processes that influence human behavior", [
    "Group behavior: social facilitation, deindividuation, groupthink",
    "Conformity, obedience and peer pressure",
    "Socialization and norms",
  ]),
  cat("7C", "ps", "Attitude and behavior change", [
    "Associative learning (classical and operant conditioning)",
    "Observational learning",
    "Theories of attitude change (elaboration likelihood, persuasion)",
  ]),
  cat("8A", "ps", "Self-identity", [
    "Self-concept, self-esteem and self-efficacy",
    "Identity formation (Erikson, Kohlberg, Freud)",
  ]),
  cat("8B", "ps", "Social thinking", [
    "Attribution theory and biases",
    "Prejudice, stereotypes and discrimination",
  ]),
  cat("8C", "ps", "Social interactions", [
    "Elements of social interaction and self-presentation",
    "Social behavior: attraction, aggression, altruism",
    "Social support and discrimination",
  ]),
  cat("9A", "ps", "Understanding social structure", [
    "Sociological theories (functionalism, conflict, symbolic interactionism)",
    "Social institutions",
    "Culture",
  ]),
  cat("9B", "ps", "Demographic characteristics and processes", [
    "Demographic structure of society",
    "Demographic shifts and social change",
  ]),
  cat("10A", "ps", "Social inequality", [
    "Spatial inequality",
    "Social class, stratification and mobility",
    "Health disparities",
  ]),

  // ── Critical Analysis and Reasoning Skills ──
  cat("CARS", "cars", "Critical Analysis and Reasoning Skills", [
    "Foundations of comprehension",
    "Reasoning within the text",
    "Reasoning beyond the text",
    "Passage mapping and timing",
  ]),
];

export const TOPICS: (Topic & { category: string; section: SectionId })[] = OUTLINE.flatMap((c) =>
  c.topics.map((t) => ({ ...t, category: c.id, section: c.section }))
);

const BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

export function topic(id: string | null | undefined) {
  return id ? BY_ID.get(id) ?? null : null;
}
