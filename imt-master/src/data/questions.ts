export interface Question {
  id: string;
  category: string;
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  scenarioType:
    | "intersection"
    | "roundabout"
    | "overtaking"
    | "pedestrian"
    | "motorway"
    | "signs"
    | "general";
}

export const questions: Question[] = [
  {
    id: "q1",
    category: "Prioridade",
    scenario: "Cruzamento sem sinalização",
    question:
      "Num cruzamento sem sinalização, quatro veículos chegam ao mesmo tempo. Quem tem prioridade?",
    options: [
      "O veículo que vem da direita",
      "O veículo que vem da esquerda",
      "O veículo mais rápido",
      "O primeiro a buzinar",
    ],
    correctIndex: 0,
    explanation:
      "Em Portugal, num cruzamento sem sinalização, aplica-se a regra da prioridade à direita. O veículo que se aproxima pela direita tem prioridade de passagem.",
    difficulty: "easy",
    scenarioType: "intersection",
  },
  {
    id: "q2",
    category: "Rotundas",
    scenario: "Entrada na rotunda",
    question:
      "Ao entrar numa rotunda, a quem deve ceder passagem?",
    options: [
      "Aos veículos que já circulam na rotunda",
      "Aos veículos que vêm da direita",
      "Ninguém, tenho sempre prioridade ao entrar",
      "Apenas aos veículos de emergência",
    ],
    correctIndex: 0,
    explanation:
      "Ao entrar numa rotunda, deve ceder passagem a todos os veículos que já se encontram a circular dentro da rotunda.",
    difficulty: "easy",
    scenarioType: "roundabout",
  },
  {
    id: "q3",
    category: "Ultrapassagem",
    scenario: "Estrada nacional com trator",
    question:
      "Numa estrada nacional com linha contínua, pode ultrapassar um trator agrícola?",
    options: [
      "Não, a linha contínua proíbe qualquer ultrapassagem",
      "Sim, sempre que a velocidade do trator seja inferior a 30 km/h",
      "Sim, se tiver boa visibilidade",
      "Apenas se o trator sinalizar que pode passar",
    ],
    correctIndex: 0,
    explanation:
      "A linha longitudinal contínua proíbe a ultrapassagem, independentemente da velocidade do veículo à frente. Deve aguardar por uma zona de linha descontínua.",
    difficulty: "medium",
    scenarioType: "overtaking",
  },
  {
    id: "q4",
    category: "Peões",
    scenario: "Passadeira com criança",
    question:
      "Uma criança aproxima-se de uma passadeira. O que deve fazer?",
    options: [
      "Abrandar e parar para deixar a criança atravessar",
      "Buzinar para alertar a criança",
      "Manter a velocidade se a criança ainda não está na passadeira",
      "Acelerar para passar antes da criança",
    ],
    correctIndex: 0,
    explanation:
      "Deve sempre abrandar e parar quando um peão se aproxima de uma passadeira, especialmente crianças. A segurança dos peões é prioritária.",
    difficulty: "easy",
    scenarioType: "pedestrian",
  },
  {
    id: "q5",
    category: "Autoestrada",
    scenario: "Entrada na autoestrada",
    question:
      "Na via de aceleração de uma autoestrada com tráfego intenso, como deve proceder?",
    options: [
      "Acelerar na via de aceleração e encontrar uma abertura segura para se inserir",
      "Parar no final da via de aceleração e esperar",
      "Entrar imediatamente na autoestrada sem olhar",
      "Circular pela berma até encontrar espaço",
    ],
    correctIndex: 0,
    explanation:
      "Deve utilizar toda a extensão da via de aceleração para atingir uma velocidade adequada e inserir-se no tráfego de forma segura, cedendo passagem aos veículos já na autoestrada.",
    difficulty: "medium",
    scenarioType: "motorway",
  },
  {
    id: "q6",
    category: "Sinais",
    scenario: "Sinal de STOP",
    question: "Perante um sinal de STOP, o que deve fazer?",
    options: [
      "Parar obrigatoriamente e ceder passagem",
      "Abrandar e ceder passagem se necessário",
      "Parar apenas se houver trânsito",
      "O sinal é apenas informativo",
    ],
    correctIndex: 0,
    explanation:
      "O sinal de STOP obriga a paragem total do veículo e a ceder passagem a todos os veículos que circulam na via em que vai entrar.",
    difficulty: "easy",
    scenarioType: "signs",
  },
  {
    id: "q7",
    category: "Velocidade",
    scenario: "Limite de velocidade em localidade",
    question:
      "Qual é o limite máximo de velocidade dentro de uma localidade para automóveis ligeiros?",
    options: ["50 km/h", "60 km/h", "40 km/h", "30 km/h"],
    correctIndex: 0,
    explanation:
      "O limite máximo de velocidade dentro das localidades é de 50 km/h para automóveis ligeiros, salvo sinalização em contrário.",
    difficulty: "easy",
    scenarioType: "general",
  },
  {
    id: "q8",
    category: "Prioridade",
    scenario: "Cruzamento com semáforo",
    question:
      "O semáforo está amarelo fixo. O que deve fazer?",
    options: [
      "Parar antes do cruzamento, se possível em segurança",
      "Acelerar para passar rapidamente",
      "Continuar à mesma velocidade",
      "Parar imediatamente no meio do cruzamento",
    ],
    correctIndex: 0,
    explanation:
      "O sinal amarelo fixo significa que deve parar antes da linha de paragem, a menos que já esteja tão perto que não consiga parar em segurança.",
    difficulty: "medium",
    scenarioType: "intersection",
  },
  {
    id: "q9",
    category: "Rotundas",
    scenario: "Saída da rotunda",
    question:
      "Ao sair de uma rotunda com duas faixas, em que faixa deve circular?",
    options: [
      "Na faixa exterior (direita)",
      "Na faixa interior (esquerda)",
      "Em qualquer faixa",
      "Depende da velocidade",
    ],
    correctIndex: 0,
    explanation:
      "Ao preparar a saída da rotunda, deve posicionar-se na faixa exterior (direita) e sinalizar a mudança de direção para a direita.",
    difficulty: "medium",
    scenarioType: "roundabout",
  },
  {
    id: "q10",
    category: "Autoestrada",
    scenario: "Avaria na autoestrada",
    question:
      "Se o seu veículo avariar na autoestrada, o que deve fazer em primeiro lugar?",
    options: [
      "Ligar os quatro piscas e tentar encostar na berma",
      "Parar imediatamente na faixa onde está",
      "Continuar a circular até à próxima saída",
      "Sair do veículo e pedir ajuda",
    ],
    correctIndex: 0,
    explanation:
      "Deve ligar imediatamente os quatro piscas (luzes de perigo) e tentar dirigir o veículo para a berma, de forma segura, para não obstruir o trânsito.",
    difficulty: "hard",
    scenarioType: "motorway",
  },
  {
    id: "q11",
    category: "Sinais",
    scenario: "Sinal de cedência de passagem",
    question:
      "Qual a diferença entre o sinal de STOP e o sinal de cedência de passagem (triângulo invertido)?",
    options: [
      "No STOP é obrigatório parar; na cedência só se necessário",
      "São iguais, ambos obrigam a parar",
      "O triângulo invertido obriga a parar, o STOP não",
      "Não existe diferença prática",
    ],
    correctIndex: 0,
    explanation:
      "O sinal STOP obriga sempre à paragem total. O sinal de cedência de passagem obriga a abrandar e a ceder passagem, mas só a parar se necessário para tal.",
    difficulty: "medium",
    scenarioType: "signs",
  },
  {
    id: "q12",
    category: "Ultrapassagem",
    scenario: "Ultrapassagem em autoestrada",
    question:
      "Após ultrapassar um veículo na autoestrada, quando deve regressar à faixa da direita?",
    options: [
      "Assim que puder ver o veículo ultrapassado no espelho retrovisor",
      "Imediatamente após passar o veículo",
      "Só quando quiser reduzir a velocidade",
      "Nunca, pode continuar na faixa da esquerda",
    ],
    correctIndex: 0,
    explanation:
      "Deve regressar à faixa da direita assim que puder ver o veículo ultrapassado pelo espelho retrovisor interior, garantindo distância de segurança.",
    difficulty: "hard",
    scenarioType: "overtaking",
  },
];

export const categories = [
  {
    id: "priority",
    name: "Prioridade",
    icon: "🔀",
    description: "Regras de prioridade em cruzamentos e interseções",
    color: "#36a9f8",
  },
  {
    id: "roundabouts",
    name: "Rotundas",
    icon: "🔄",
    description: "Circulação em rotundas e regras de prioridade",
    color: "#22c55e",
  },
  {
    id: "overtaking",
    name: "Ultrapassagem",
    icon: "🏎️",
    description: "Regras de ultrapassagem em diferentes cenários",
    color: "#f59e0b",
  },
  {
    id: "pedestrians",
    name: "Peões",
    icon: "🚶",
    description: "Segurança de peões e passadeiras",
    color: "#ef4444",
  },
  {
    id: "motorway",
    name: "Autoestrada",
    icon: "🛣️",
    description: "Regras de circulação em autoestrada",
    color: "#8b5cf6",
  },
  {
    id: "signs",
    name: "Sinais",
    icon: "🪧",
    description: "Sinalização vertical e horizontal",
    color: "#d4a853",
  },
];
