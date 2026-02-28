/**
 * Types used by the Zeni landing page.
 */

export interface Project {
  id: number;
  listingId?: string;
  title: string;
  location: string;
  type: string;
  price: string;
  image: string;
  alt?: string;
}

export type InsightItem = {
  id?: string;
  tag: string;
  title: string;
  desc: string;
  href?: string;
};
