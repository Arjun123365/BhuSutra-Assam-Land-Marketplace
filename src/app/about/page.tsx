import { AboutBhuSutra } from "../../components/about-bhusutra";
import { HomepageFooter } from "../../components/homepage-content";
import { SiteHeader } from "../../components/site-header";
export const metadata = { title: "About BhuSutra | ভূসূত্ৰ" };
export default function AboutPage() { return <div id="home"><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader activePage="about" /><main id="main-content"><AboutBhuSutra /></main><HomepageFooter /></div>; }
