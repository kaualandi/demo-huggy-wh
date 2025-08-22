interface SchedulingSlot {
  date: string;
  time: string;
  dayOfWeek: string;
}

interface DoctorInfo {
  name: string;
  specialty: string;
}

export const clinicConfig = {
  name: "Clínica Olhar Mais",
  attendant: "Leonardo",
  
  doctors: {
    ophthalmologist: {
      name: "Dr. Matheus",
      specialty: "Oftalmologia"
    }
  } as Record<string, DoctorInfo>,
  
  // Slots de agendamento disponíveis (seria idealmente vindo de uma API)
  availableSlots: [
    {
      date: "4 de outubro",
      time: "10h",
      dayOfWeek: "sexta-feira"
    },
    {
      date: "7 de outubro", 
      time: "14h",
      dayOfWeek: "segunda-feira"
    },
    {
      date: "9 de outubro",
      time: "16h", 
      dayOfWeek: "quarta-feira"
    }
  ] as SchedulingSlot[],
  
  // Mapeamento de tipos de exame para orientações específicas
  examTypeMapping: {
    "oct": {
      fullName: "tomografia de coerência óptica (OCT)",
      followUpMonths: 3,
      urgencyLevel: "preventivo"
    },
    "retinografia": {
      fullName: "retinografia",
      followUpMonths: 6,
      urgencyLevel: "acompanhamento regular"
    },
    "fundo_olho": {
      fullName: "exame de fundo de olho",
      followUpMonths: 6,
      urgencyLevel: "acompanhamento regular"
    }
  },
  
  // Frases padrão para diferentes situações
  standardPhrases: {
    greeting: "😊",
    farewell: "😊",
    reassurance: "A boa notícia é que",
    concern_acknowledgment: "Entendo perfeitamente",
    availability: "Qualquer coisa, estamos à disposição"
  }
};

export function getPreferredSchedulingSlot(patientPreference?: string): SchedulingSlot | null {
  if (!patientPreference) {
    return clinicConfig.availableSlots[0]; // Retorna o primeiro disponível
  }
  
  const preference = patientPreference.toLowerCase();
  
  // Buscar por dia da semana preferido
  const preferredSlot = clinicConfig.availableSlots.find(slot => 
    slot.dayOfWeek.toLowerCase().includes(preference) ||
    preference.includes(slot.dayOfWeek.toLowerCase())
  );
  
  return preferredSlot || clinicConfig.availableSlots[0];
}
