import { useNavigate } from "react-router-dom";
import { AllClientsCrewTable } from "@/components/suite/AllClientsCrewTable";

export default function FileManagement() {
  const navigate = useNavigate();
  return <AllClientsCrewTable readOnly onClose={() => navigate("/")} />;
}
