export interface RoadSign {
  id: string;
  name: string;
  namePt: string;
  category: "danger" | "prohibition" | "obligation" | "information" | "priority";
  description: string;
  descriptionPt: string;
  shape: "circle" | "triangle" | "octagon" | "rectangle" | "diamond" | "inverted-triangle";
  primaryColor: string;
  secondaryColor: string;
  symbol: string;
  importance: "critical" | "high" | "medium";
}

export const roadSigns: RoadSign[] = [
  {
    id: "stop",
    name: "Stop",
    namePt: "Paragem obrigatória",
    category: "priority",
    description: "Mandatory stop. You must stop completely and give way to all traffic.",
    descriptionPt: "Paragem obrigatória. Deve parar completamente e ceder passagem a todo o trânsito.",
    shape: "octagon",
    primaryColor: "#ef4444",
    secondaryColor: "#ffffff",
    symbol: "STOP",
    importance: "critical",
  },
  {
    id: "yield",
    name: "Yield",
    namePt: "Cedência de passagem",
    category: "priority",
    description: "Give way to traffic on the road you are entering.",
    descriptionPt: "Ceda passagem ao trânsito da via em que vai entrar.",
    shape: "inverted-triangle",
    primaryColor: "#ef4444",
    secondaryColor: "#ffffff",
    symbol: "▽",
    importance: "critical",
  },
  {
    id: "speed-50",
    name: "Speed Limit 50",
    namePt: "Limite de velocidade 50 km/h",
    category: "prohibition",
    description: "Maximum speed limit of 50 km/h.",
    descriptionPt: "Velocidade máxima permitida de 50 km/h.",
    shape: "circle",
    primaryColor: "#ef4444",
    secondaryColor: "#ffffff",
    symbol: "50",
    importance: "high",
  },
  {
    id: "roundabout",
    name: "Roundabout",
    namePt: "Rotunda",
    category: "obligation",
    description: "Roundabout ahead. Circulate in the indicated direction.",
    descriptionPt: "Rotunda à frente. Circule no sentido indicado.",
    shape: "circle",
    primaryColor: "#3b82f6",
    secondaryColor: "#ffffff",
    symbol: "↻",
    importance: "high",
  },
  {
    id: "no-entry",
    name: "No Entry",
    namePt: "Sentido proibido",
    category: "prohibition",
    description: "Entry prohibited for all vehicles.",
    descriptionPt: "Entrada proibida a todos os veículos.",
    shape: "circle",
    primaryColor: "#ef4444",
    secondaryColor: "#ffffff",
    symbol: "—",
    importance: "critical",
  },
  {
    id: "pedestrian-crossing",
    name: "Pedestrian Crossing",
    namePt: "Passagem para peões",
    category: "information",
    description: "Pedestrian crossing ahead. Slow down and be prepared to stop.",
    descriptionPt: "Passagem para peões à frente. Reduza a velocidade e prepare-se para parar.",
    shape: "rectangle",
    primaryColor: "#3b82f6",
    secondaryColor: "#ffffff",
    symbol: "🚶",
    importance: "high",
  },
  {
    id: "motorway",
    name: "Motorway",
    namePt: "Autoestrada",
    category: "information",
    description: "Start of motorway. Minimum speed 60 km/h.",
    descriptionPt: "Início de autoestrada. Velocidade mínima 60 km/h.",
    shape: "rectangle",
    primaryColor: "#22c55e",
    secondaryColor: "#ffffff",
    symbol: "AE",
    importance: "high",
  },
];
