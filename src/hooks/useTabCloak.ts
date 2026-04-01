import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { applyCloak } from "../lib/cloak";

export const useTabCloak = () => {
  const [tabCloak] = useLocalStorage("tabCloak", "None");
  const [customFavicon] = useLocalStorage("customCloakFavicon", "");
  const [customTitle] = useLocalStorage("customCloakTitle", "");

  useEffect(() => {
    applyCloak(tabCloak);
  }, [tabCloak, customFavicon, customTitle]);
};
