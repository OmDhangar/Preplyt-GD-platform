import { Link } from "@tanstack/react-router";
import { Instagram, Linkedin } from "lucide-react";

export function Footer() {
  const mentors = [
    { name: "Ms. Sana Khan", url: null },
    { name: "Mr. Abhishek Rishi", url: "https://www.linkedin.com/in/abhishekrishi0312/" },
    { name: "Mr. Yash Sipani", url: "https://www.linkedin.com/in/yash-sipani-45996a1b3/" },
    { name: "Mr. Medhansh Singh", url: "https://www.linkedin.com/in/medhansh-singh/" },
    { name: "Mr. Rushikesh Arande", url: "https://www.linkedin.com/in/rushikesh-arande-433989208/" },
  ];

  return (
    <footer className="border-t border-white/5 bg-bg-dark pt-16 pb-12 text-text-muted-dark relative overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-80 h-80 bg-accent-teal/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-50 mb-12">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-teal flex items-center justify-center font-display text-sm font-bold text-white shadow-glow-teal">
                PL
              </div>
              <span className="font-display font-bold text-base tracking-tight text-white">
                Prep<span className="text-gradient-teal font-extrabold">Lyt</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-text-muted-dark max-w-xs">
              A live, moderated group discussion platform. Practice, get evaluated, and ace your interviews with top industry mentors.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase font-display">Explore</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/" className="hover:text-accent-teal transition-colors duration-200">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about-us" className="hover:text-accent-teal transition-colors duration-200">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/upcoming-gds" className="hover:text-accent-teal transition-colors duration-200">
                  Upcoming GDs
                </Link>
              </li>
              <li>
                <Link to="/b2b" className="hover:text-accent-teal transition-colors duration-200">
                  B2B Services
                </Link>
              </li>
            </ul>
          </div>

          {/* Mentors */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase font-display">Our Mentors</h4>
            <ul className="space-y-2.5 text-xs">
              {mentors.map((mentor) => (
                <li key={mentor.name}>
                  {mentor.url ? (
                    <a
                      href={mentor.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-accent-teal transition-colors duration-200 flex items-center gap-1.5 group w-fit"
                    >
                      <span>{mentor.name}</span>
                      <Linkedin className="h-3.5 w-3.5 text-[#0A66C2] opacity-80 group-hover:opacity-100 transition-opacity duration-200" />
                    </a>
                  ) : (
                    <span className="text-text-muted-dark/85">{mentor.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase font-display">Connect With Us</h4>
            <div className="flex flex-col gap-3">
              <a
                href="https://www.instagram.com/preplyt_?igsh=amlibzR6dDdwZXJq"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs bg-white/5 hover:bg-white/10 hover:text-white px-4 py-2.5 rounded-lg transition-all duration-300 w-fit border border-white/5 hover:border-white/10 shadow-sm"
              >
                <Instagram className="h-4 w-4 text-pink-500" />
                <span className="font-medium">Instagram</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium">
          <div className="text-text-muted-dark/90">
            © {new Date().getFullYear()} PrepLyt. All rights reserved.
          </div>
          <div className="text-text-muted-dark/70">
            Moderated live group discussion software.
          </div>
        </div>
      </div>
    </footer>
  );
}
