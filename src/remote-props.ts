// Public props contract v2. Kept local so each repository builds independently.
export interface CatalogProps {
  apiBaseUrl: string;
  cartKey: string;
  onCartChanged?: () => void;
}
export interface CartProps {
  apiBaseUrl: string;
  cartKey: string;
  refreshVersion?: number;
}
