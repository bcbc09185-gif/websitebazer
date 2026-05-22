import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShoppingBag, 
  User as UserIcon, 
  Plus, 
  LogOut, 
  LayoutDashboard, 
  Search,
  Menu,
  X,
  Facebook,
  Mail,
  Lock,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Package,
  Users as UsersIcon,
  DollarSign,
  Briefcase,
  GraduationCap,
  PlayCircle,
  HeartPulse,
  Globe,
  ExternalLink,
  Download,
  Image as ImageIcon,
  ArrowRight,
  CheckCircle,
  Calendar,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from './lib/firebase';
import { Product, User, Order, Sale, GuidePack, PaymentConfig } from './types';
import CheckoutModal from './components/CheckoutModal';
import MyOrdersModal from './components/MyOrdersModal';
import EditGuidePackModal from './components/EditGuidePackModal';
import AIAssistant from './components/AIAssistant';
import toast, { Toaster } from 'react-hot-toast';

// --- Shared Components ---

const Button = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' }) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-indigo-900 text-white hover:bg-indigo-950',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
    danger: 'bg-red-500 text-white hover:bg-red-600'
  };
  return (
    <button 
      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
  <div className="space-y-1.5">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input 
      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 placeholder:text-gray-400"
      {...props}
    />
  </div>
);

// --- App Component ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [showMyOrders, setShowMyOrders] = useState(false);
  const [userOrders, setUserOrders] = useState<Order[]>([]);

  const fetchUserOrders = useCallback(async () => {
    if (!currentUser?.email) {
      setUserOrders([]);
      return;
    }
    try {
      const res = await fetch(`/api/orders?email=${encodeURIComponent(currentUser.email)}`);
      if (res.ok) {
        const data = await res.json();
        setUserOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching user orders:", err);
    }
  }, [currentUser?.email]);

  useEffect(() => {
    fetchUserOrders();
  }, [fetchUserOrders]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json().catch(() => ({ error: "Invalid JSON response from server" }));
      if (!res.ok) {
        if (res.status === 503) {
          setDbError(data.message + " " + data.tip);
        } else {
          toast.error(data.error || data.message || `Server Error: ${res.status}`);
        }
        setProducts([]);
        return;
      }
      if (Array.isArray(data)) {
        setProducts(data);
        setDbError(null);
      } else {
        console.error("Received non-array data for products:", data);
        setProducts([]);
      }
    } catch (err: any) {
      console.error("Fetch products error:", err);
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        toast.error("Unable to connect to the server. Please ensure the dev server is running.");
      } else {
        toast.error(err.message || "Failed to connect to the store database.");
      }
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    // Add a tiny delay to allow Firebase to settle
    const timer = setTimeout(() => {
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        if (user) {
          try {
            const res = await fetch('/api/users/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: user.email,
                firstName: user.displayName?.split(' ')[0] || 'Guest',
                lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
              })
            });
            if (res.ok) {
              const data = await res.json();
              setDbUser(data);
            }
          } catch (err) {
            console.error("User sync error:", err);
          }
        } else {
          setDbUser(null);
        }
      }, (error) => {
        console.error("Firebase Auth State error:", error);
      });
    }, 100);

    fetchProducts();
    
    return () => {
      clearTimeout(timer);
      if (unsubscribe) unsubscribe();
    };
  }, [fetchProducts]);

  const handleLogout = () => {
    signOut(auth);
    setIsAdminView(false);
    toast.success("Logged out successfully");
  };

  const isAdmin = dbUser?.email === 'bcbc09185@gmail.com' || (dbUser?.role === 'admin');

  useEffect(() => {
    (window as any).setShowConsultationModal = setShowConsultationModal;
    (window as any).setSelectedProduct = setSelectedProduct;

    // Protection from copy, drag-drop, right-click, keyboard dev shortcuts
    const handleContextMenu = (e: MouseEvent) => {
      if (isAdmin && isAdminView) return;
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAdmin && isAdminView) return;
      
      const ctrlKey = e.ctrlKey || e.metaKey;
      
      // Block standard copy/save/source view keys: Ctrl+C, Ctrl+U, Ctrl+S, Ctrl+A
      if (ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S' || e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
      }

      // Block developer inspector tools: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (
        e.key === 'F12' || 
        (ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'))
      ) {
        e.preventDefault();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      if (isAdmin && isAdminView) return;
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, [isAdmin, isAdminView]);

  return (
    <div className={`min-h-screen flex flex-col pt-16 ${!(isAdmin && isAdminView) ? 'select-none' : ''}`}>
      <Navbar 
        user={currentUser} 
        onAuthClick={() => setShowAuthModal(true)} 
        onLogout={handleLogout}
        isAdmin={isAdmin}
        isAdminView={isAdminView}
        onToggleAdmin={() => setIsAdminView(!isAdminView)}
        onMyOrdersClick={() => setShowMyOrders(true)}
        userOrders={userOrders}
      />

      {dbError && (
        <div className="bg-red-50 border-b border-red-100 py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center gap-3 text-red-800 text-sm font-medium">
            <X size={16} className="bg-red-600 text-white rounded-full p-0.5" />
            <p>{dbError}</p>
          </div>
        </div>
      )}
      
      <main className="flex-grow">
        {isAdminView ? (
          <AdminPanel onProductAdded={fetchProducts} />
        ) : (
          <Home 
            products={products} 
            loading={loading} 
            onProductClick={(p: Product) => setSelectedProduct(p)}
            onBuy={(p: Product) => {
              if (!currentUser) setShowAuthModal(true);
              else toast.success(`Inquiry sent for ${p.name}!`);
            }} 
          />
        )}
      </main>

      <Footer />
      
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)} 
            onAdminLogin={() => {
              setShowAuthModal(false);
              setIsAdminView(true);
            }}
          />
        )}
        {showConsultationModal && (
          <ConsultationModal onClose={() => setShowConsultationModal(false)} />
        )}
        {selectedProduct && (
          <ProductDetailModal 
            product={selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
            onBuy={() => {
              if (!currentUser) {
                setShowAuthModal(true);
              } else {
                setCheckoutProduct(selectedProduct);
                setSelectedProduct(null);
              }
            }}
            isUnlocked={userOrders.some(o => o.productId?._id === selectedProduct._id && o.status === 'confirmed')}
          />
        )}
        {checkoutProduct && currentUser && (
          <CheckoutModal 
            product={checkoutProduct} 
            userEmail={currentUser.email || ''} 
            onClose={() => setCheckoutProduct(null)} 
            onOrderSuccess={() => {
              fetchUserOrders();
            }}
          />
        )}
        {showMyOrders && currentUser && (
          <MyOrdersModal 
            orders={userOrders} 
            onClose={() => setShowMyOrders(false)} 
            onSelectProduct={(p: Product) => {
              setSelectedProduct(p);
            }}
          />
        )}
      </AnimatePresence>
      
      <Toaster position="bottom-right" />
      <AIAssistant />
    </div>
  );
}

// --- Navigation ---

function Navbar({ user, onAuthClick, onLogout, isAdmin, isAdminView, onToggleAdmin, onMyOrdersClick, userOrders = [] }: any) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 ${isScrolled || isMobileMenuOpen ? 'bg-white shadow-sm border-b border-gray-100 py-3' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setIsMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <img 
            src="https://i.ibb.co.com/5zYdzSr/Gemini-Generated-Image-3r4ci43r4ci43r4c.png" 
            alt="Website Bazer Logo" 
            className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-blue-200"
          />
          <span className="text-xl font-display font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Website Bazer
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Home</a>
          <a href="#shop" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Marketplace</a>
          <a href="#about" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">About Us</a>
        </div>

        {/* Desktop Controls */}
        <div className="hidden md:flex items-center gap-3">
          {isAdmin && (
            <Button variant={isAdminView ? 'secondary' : 'outline'} onClick={onToggleAdmin}>
              <LayoutDashboard size={18} />
              {isAdminView ? 'Storefront' : 'Admin Panel'}
            </Button>
          )}
          
          {user ? (
            <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
              <button
                onClick={onMyOrdersClick}
                className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-sm rounded-xl transition-all flex items-center gap-2"
              >
                <ShoppingBag size={16} />
                <span>My Orders</span>
              </button>
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-semibold text-gray-900">{user.displayName || user.email}</span>
                <span className="text-xs text-gray-500 capitalize">{isAdmin ? 'Administrator' : 'Verified Buyer'}</span>
              </div>
              <button 
                onClick={onLogout}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-red-600 transition-all"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <Button onClick={onAuthClick}>
              <UserIcon size={18} />
              Sign In
            </Button>
          )}
        </div>

        {/* Mobile controls: Hamburger & Orders quick icon */}
        <div className="flex md:hidden items-center gap-2">
          {user && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onMyOrdersClick();
              }}
              className="p-2.5 bg-blue-50 text-blue-600 font-bold rounded-xl transition-all flex items-center justify-center relative active:scale-95"
              aria-label="My Orders"
            >
              <ShoppingBag size={18} />
              {userOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold border-2 border-white animate-pulse">
                  {userOrders.length}
                </span>
              )}
            </button>
          )}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all flex items-center justify-center active:scale-95"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X size={20} className="text-red-500" /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden border-t border-gray-100 bg-white overflow-hidden mt-3 shadow-xl rounded-b-3xl"
          >
            <div className="p-5 space-y-6">
              {/* Navigation Links */}
              <div className="flex flex-col gap-4">
                <a 
                  href="#" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-4 py-3 bg-gray-50 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-bold transition-all text-sm block"
                >
                  Home
                </a>
                <a 
                  href="#shop" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-4 py-3 bg-gray-50 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-bold transition-all text-sm block"
                >
                  Marketplace
                </a>
                <a 
                  href="#about" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-4 py-3 bg-gray-50 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-bold transition-all text-sm block"
                >
                  About Us
                </a>
              </div>

              {/* Account actions */}
              <div className="pt-4 border-t border-gray-100 space-y-4">
                {isAdmin && (
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onToggleAdmin();
                    }}
                    className="w-full py-3 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm"
                  >
                    <LayoutDashboard size={16} />
                    <span>{isAdminView ? 'Go To Storefront' : 'Go To Admin Panel'}</span>
                  </button>
                )}

                {user ? (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-gray-50 rounded-2xl flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <UserIcon size={16} />
                      </div>
                      <div className="flex flex-col max-w-[220px]">
                        <span className="text-xs font-black text-gray-900 truncate">{user.displayName || user.email}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold">{isAdmin ? 'Administrator' : 'Verified Buyer'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onMyOrdersClick();
                        }}
                        className="flex-1 py-3 bg-blue-600 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-600/10 hover:bg-blue-700 active:scale-95 transition-all"
                      >
                        <ShoppingBag size={16} />
                        <span>My Orders ({userOrders.length})</span>
                      </button>
                      
                      <button 
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onLogout();
                        }}
                        className="px-4 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all"
                        aria-label="Logout"
                      >
                        <LogOut size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onAuthClick();
                    }}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                  >
                    <UserIcon size={18} />
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

// --- Home Page ---

const CATEGORIES = [
  { 
    name: 'E-Commerce / Shopping', 
    icon: '🛒', 
    groups: [
      { title: 'Marketplace', items: ['Product Listing Site', 'Multi-vendor marketplace', 'Digital products store'] },
      { title: 'Retail', items: ['Grocery delivery', 'Fashion & clothing', 'Electronics shop', 'Handmade/crafts store'] },
      { title: 'Services', items: ['Booking system', 'Auction portal', 'Classified ads'] }
    ] 
  },
  { 
    name: 'News & Blog', 
    icon: '📰', 
    groups: [
      { title: 'Publishing', items: ['Personal blog', 'News portal', 'Magazine site'] },
      { title: 'Specialized', items: ['Tech blog', 'Travel blog', 'Food blog', 'Sports news'] }
    ] 
  },
  { 
    name: 'Education', 
    icon: '🎓', 
    groups: [
      { title: 'LMS', items: ['Online course platform', 'Tutoring platform', 'Quiz/exam site'] },
      { title: 'Institutional', items: ['School/college site', 'Library site', 'Kindergarten portal'] }
    ] 
  },
  { 
    name: 'Business', 
    icon: '💼', 
    groups: [
      { title: 'Corporate', items: ['Company portfolio', 'Agency site', 'Startup landing page'] },
      { title: 'Solutions', items: ['SaaS product site', 'Consulting firm', 'Legal practice'] }
    ] 
  },
  { 
    name: 'Healthcare', 
    icon: '🏥', 
    groups: [
      { title: 'Medical', items: ['Hospital site', 'Doctor appointment', 'Pharmacy site'] },
      { title: 'Wellness', items: ['Mental health platform', 'Fitness & wellness', 'Yoga studio'] }
    ] 
  },
  { 
    name: 'Food & Dining', 
    icon: '🍽️', 
    groups: [
      { title: 'Restaurant', items: ['Restaurant site', 'Cafe/bakery', 'Catering service'] },
      { title: 'Delivery', items: ['Food delivery app', 'Recipe site', 'Diet planner'] }
    ] 
  },
  { 
    name: 'Travel', 
    icon: '🏨', 
    groups: [
      { title: 'Booking', items: ['Hotel booking', 'Tour package site', 'Airline booking'] },
      { title: 'Rentals', items: ['Car rental', 'Vacation rental', 'Visa assistance'] }
    ] 
  },
  { 
    name: 'Creative', 
    icon: '🎨', 
    groups: [
      { title: 'Portfolios', items: ['Photographer portfolio', 'Designer portfolio', 'Artist showcase'] },
      { title: 'Profiles', items: ['Freelancer profile', 'Music portfolio', 'Video production'] }
    ] 
  },
  { 
    name: 'Real Estate', 
    icon: '🏠', 
    groups: [
      { title: 'Property', items: ['Property listing', 'House rent/sale', 'Land marketplace'] },
      { title: 'Interior', items: ['Interior design', 'Construction company', 'Architecture firm'] }
    ] 
  },
  { 
    name: 'Community', 
    icon: '💬', 
    groups: [
      { title: 'Social', items: ['Social network', 'Forum/discussion', 'Dating site'] },
      { title: 'Jobs', items: ['Job portal', 'Freelance marketplace', 'Directory site'] }
    ] 
  },
  { 
    name: 'Tools & SaaS', 
    icon: '🔧', 
    groups: [
      { title: 'Utility', items: ['Productivity tool', 'Invoice generator', 'URL shortener'] },
      { title: 'Finance', items: ['Weather app', 'Finance tracker', 'Analytics dashboard'] }
    ] 
  },
];

function Home({ products, loading, onBuy, onProductClick }: any) {
  const banners = [
    "https://i.ibb.co.com/GfgSg6jv/width-1406-imgupscaler-ai-General-4-K.jpg",
    "https://i.ibb.co.com/tpKX0G5g/a6ae705e-082c-4a9f-9c8a-69f3aa5fe6ed.png"
  ];

  const [currentBanner, setCurrentBanner] = useState(0);
  const [direction, setDirection] = useState(0);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedTechnology, setSelectedTechnology] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract all unique technologies from products dynamically
  const allUniqueTechnologies = useMemo(() => {
    const techsSet = new Set<string>();
    products.forEach((p: any) => {
      if (Array.isArray(p.technologies)) {
        p.technologies.forEach((t: string) => {
          if (t && t.trim()) {
            techsSet.add(t.trim());
          }
        });
      }
    });
    return Array.from(techsSet).sort((a, b) => a.localeCompare(b));
  }, [products]);

  // Filtering Logic
  const filteredProducts = products.filter((product: any) => {
    if (selectedCategory) {
      if (product.category !== selectedCategory) return false;
    }
    if (selectedSubcategory) {
      if (product.subcategory !== selectedSubcategory) return false;
    }
    if (selectedTechnology) {
      if (!product.technologies || !product.technologies.includes(selectedTechnology)) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesName = product.name?.toLowerCase().includes(q) || false;
      const matchesDesc = product.description?.toLowerCase().includes(q) || false;
      const matchesCat = product.category?.toLowerCase().includes(q) || false;
      const matchesSubcat = product.subcategory?.toLowerCase().includes(q) || false;
      const matchesTechs = product.technologies?.some((tech: string) => tech.toLowerCase().includes(q)) || false;
      if (!matchesName && !matchesDesc && !matchesCat && !matchesSubcat && !matchesTechs) return false;
    }
    return true;
  });

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0
    })
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentBanner(prev => (prev + newDirection + banners.length) % banners.length);
  };

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      paginate(1);
    }, 7000);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <div className="space-y-16 pb-20">
      {/* Bento-style Hero Section */}
      <section className="max-w-7xl mx-auto px-4 mt-8">

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 h-auto relative">
          
          {/* 1. Sidebar Categories (Left) - 2 units wide */}
          <div className="hidden lg:flex lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex-col h-[450px] z-40">
            <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Menu size={18} className="text-blue-600" />
                <span>Categories</span>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto py-1 scrollbar-hide">
              {CATEGORIES.map((cat, idx) => (
                <div key={idx} className="group/item">
                  <button 
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setSelectedSubcategory(null);
                      document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-full text-left px-5 py-3 flex items-center justify-between transition-all text-[13px] font-medium border-l-4 ${
                      selectedCategory === cat.name 
                        ? 'bg-blue-50/80 text-blue-700 border-blue-600 font-bold pl-6' 
                        : 'border-transparent text-gray-700 hover:bg-gray-50/80 hover:text-blue-600 group-hover/item:text-blue-600 group-hover/item:pl-6'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg opacity-80 group-hover/item:opacity-100">{cat.icon}</span>
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <ChevronRight size={14} className="opacity-40 group-hover/item:opacity-100 transition-opacity" />
                  </button>
                  
                  {/* MEGA MENU - OVERLAYS BANNER */}
                  <div className="invisible group-hover/item:visible opacity-0 group-hover/item:opacity-100 absolute left-[calc(100%/10*2)] top-0 z-[60] w-[calc(100%/10*8)] h-full bg-white shadow-2xl border-l border-gray-100 p-10 transition-all duration-300 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-x-16 gap-y-12">
                      {cat.groups.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-5">
                          <h4 className="font-bold text-gray-900 text-[15px] tracking-tight border-b border-gray-100 pb-3">{group.title}</h4>
                          <ul className="space-y-3">
                            {group.items.map((item, iIdx) => (
                              <li 
                                key={iIdx} 
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent category trigger
                                  setSelectedCategory(cat.name);
                                  setSelectedSubcategory(item);
                                  document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className={`text-[14px] cursor-pointer transition-colors hover:translate-x-1 duration-200 flex items-center gap-2 ${
                                  selectedSubcategory === item 
                                    ? 'text-blue-600 font-black' 
                                    : 'text-gray-500 hover:text-blue-600'
                                }`}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  selectedSubcategory === item ? 'bg-blue-600' : 'bg-gray-200'
                                }`} />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-50 bg-gray-50/50">
              <button 
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedSubcategory(null);
                  setSelectedTechnology(null);
                  setSearchQuery('');
                  document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-blue-600 text-sm font-bold hover:underline"
              >
                Reset All Filters
              </button>
            </div>
          </div>

          {/* 2. Main Content Grid - 8 units wide */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4 lg:h-[450px] h-auto relative">
            
            {/* a. Large Main Slider (Center Top) - spans 3 cols on tablet, 2 cols on desktop */}
            <div className="md:col-span-3 lg:col-span-2 md:row-span-1 relative rounded-2xl overflow-hidden bg-gray-900 shadow-sm group min-h-[220px] md:min-h-[300px] lg:h-full">
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={currentBanner}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 }
                  }}
                  className="absolute inset-0"
                >
                  <img src={banners[currentBanner]} className="w-full h-full object-fill" alt="Banner" />
                  <div className="absolute inset-0 bg-black/30" />
                </motion.div>
              </AnimatePresence>
              
              {/* Overlay Content */}
              <div className="hidden md:flex absolute inset-0 z-10 flex-col justify-end pb-12 px-12 pointer-events-none">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`content-${currentBanner}`}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="max-w-md pointer-events-auto"
                  >
                    <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 bg-blue-600/20 backdrop-blur-md rounded-full border border-blue-500/30 text-blue-300 text-[10px] font-bold uppercase tracking-[0.2em]">
                      #1 Marketplace in Bangladesh
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <Button 
                        className="py-3 px-8 text-sm rounded-xl shadow-xl shadow-blue-600/30"
                        onClick={() => {
                          const shopSection = document.getElementById('shop');
                          if (shopSection) {
                            shopSection.scrollIntoView({ behavior: 'smooth' });
                            toast.success("Welcome to Marketplace!");
                          }
                        }}
                      >
                        Browse Marketplace
                      </Button>
                      <a 
                        href="https://wa.me/8801822963824?text=I%20want%20to%20build%20a%20website%2C%20so%20I%20want%20to%20hire%20you" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-8 py-3 rounded-xl shadow-xl shadow-emerald-600/20 transition-all hover:scale-[1.03] outline-none"
                      >
                        💬 Contact Us
                      </a>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Slider Controls */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                {banners.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => {
                      setDirection(i > currentBanner ? 1 : -1);
                      setCurrentBanner(i);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentBanner ? 'w-8 bg-white' : 'w-2 bg-white/40'}`}
                  />
                ))}
              </div>
              <button 
                onClick={() => paginate(-1)} 
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 z-50 pointer-events-auto shadow-lg"
              >
                <ChevronRight size={20} className="rotate-180" />
              </button>
              <button 
                onClick={() => paginate(1)} 
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 z-50 pointer-events-auto shadow-lg"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* b. Right Top Item (Philips Card) - ONLY VISIBLE ON PC/DESKTOP */}
            <div className="hidden lg:block lg:col-span-1 md:row-span-1 rounded-2xl overflow-hidden bg-white shadow-sm relative group lg:h-full">
              <img 
                src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&auto=format&fit=crop&q=60" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                alt="Pro Setup" 
              />
              <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center p-6 text-center text-white">
                <h4 className="font-extrabold text-base md:text-lg font-display leading-relaxed">
                  Contact us to build a custom website according to your needs.
                </h4>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Welcome & Mission Section */}
      <section className="hidden md:block max-w-7xl mx-auto px-4 mt-12">
        <div className="bg-white rounded-[48px] p-8 md:p-16 shadow-2xl shadow-blue-500/5 border border-gray-50 flex flex-col items-center text-center overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl"
          >
            <h2 className="text-4xl md:text-5xl mb-8 text-gray-900 font-display">
              Professional Websites <span className="text-blue-600 leading-tight">Ready to Deploy</span>
            </h2>
            <div className="space-y-6 mb-10">
              <p className="text-xl text-gray-600 leading-relaxed">
                Why wait months for development? Choose from hundreds of battle-tested prototypes and go live in minutes.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6">
              <div className="flex flex-col items-center p-5 bg-blue-50 rounded-2xl w-36">
                <span className="text-2xl font-bold text-blue-600 mb-1">24h</span>
                <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Delivery</span>
              </div>
              <div className="flex flex-col items-center p-5 bg-indigo-50 rounded-2xl w-36">
                <span className="text-2xl font-bold text-indigo-600 mb-1">100%</span>
                <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Secure</span>
              </div>
              <div className="flex flex-col items-center p-5 bg-purple-50 rounded-2xl w-36">
                <span className="text-2xl font-bold text-purple-600 mb-1">SEO</span>
                <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Optimized</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Categories Quick Access */}
      <section className="hidden md:block max-w-7xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { 
              icon: <ShoppingBag />, 
              label: 'Shopping', 
              color: 'bg-red-50 text-red-600',
              onClick: () => {
                setSelectedCategory('E-Commerce / Shopping');
                setSelectedSubcategory(null);
                document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
              }
            },
            { 
              icon: <Briefcase />, 
              label: 'Corporate', 
              color: 'bg-blue-50 text-blue-600',
              onClick: () => {
                setSelectedCategory('Business');
                setSelectedSubcategory(null);
                document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
              }
            },
            { 
              icon: <GraduationCap />, 
              label: 'Education', 
              color: 'bg-purple-50 text-purple-600',
              onClick: () => {
                setSelectedCategory('Education');
                setSelectedSubcategory(null);
                document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
              }
            },
            { 
              icon: <PlayCircle />, 
              label: 'News & Blog', 
              color: 'bg-indigo-50 text-indigo-600',
              onClick: () => {
                setSelectedCategory('News & Blog');
                setSelectedSubcategory(null);
                document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
              }
            },
            { 
              icon: <HeartPulse />, 
              label: 'Healthcare', 
              color: 'bg-green-50 text-green-600',
              onClick: () => {
                setSelectedCategory('Healthcare');
                setSelectedSubcategory(null);
                document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
              }
            },
            { 
              icon: <Globe />, 
              label: 'See All / Reset', 
              color: 'bg-gray-50 text-gray-600',
              onClick: () => {
                setSelectedCategory(null);
                setSelectedSubcategory(null);
                setSearchQuery('');
                document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
              }
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              onClick={item.onClick}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer group"
            >
              <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm`}>
                {item.icon}
              </div>
              <span className="text-sm font-bold text-gray-700">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Marketplace */}
      <section id="shop" className="max-w-7xl mx-auto px-4 mt-20">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-4xl mb-3 font-display">Marketplace Favorites</h2>
            <p className="text-gray-500">Explore high-converting templates for your next project.</p>
          </div>
          <div className="relative group w-full md:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by category, tech, or keyword..." 
              className="pl-12 pr-6 py-3.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full md:w-[28rem] shadow-sm group-hover:border-gray-300 transition-all font-medium text-sm"
            />
          </div>
        </div>

        {/* Advanced Filter Panel */}
        <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm mb-8 space-y-5 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-2">Category</label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => {
                  setSelectedCategory(e.target.value || null);
                  setSelectedSubcategory(null);
                }}
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100/50 transition-colors"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((cat, idx) => (
                  <option key={idx} value={cat.name}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>

            {/* Sub-category Dropdown */}
            <div>
              <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-2">Sub-category</label>
              <select
                value={selectedSubcategory || ''}
                onChange={(e) => setSelectedSubcategory(e.target.value || null)}
                disabled={!selectedCategory}
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100/50 transition-colors"
              >
                <option value="">All Sub-categories</option>
                {selectedCategory && CATEGORIES.find(c => c.name === selectedCategory)?.groups.flatMap(g => g.items).map((item, idx) => (
                  <option key={idx} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* Technology selection Dropdown */}
            <div>
              <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-2">Technology Used</label>
              <select
                value={selectedTechnology || ''}
                onChange={(e) => setSelectedTechnology(e.target.value || null)}
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100/50 transition-colors"
              >
                <option value="">All Technologies</option>
                {allUniqueTechnologies.map((tech, idx) => (
                  <option key={idx} value={tech}>💻 {tech}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Technology Tags */}
          {allUniqueTechnologies.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <span className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">Quick Tech Badges / Search by Tech:</span>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                {allUniqueTechnologies.map((tech, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (selectedTechnology === tech) {
                        setSelectedTechnology(null);
                      } else {
                        setSelectedTechnology(tech);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                      selectedTechnology === tech
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-250 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {tech}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active Filters Bar */}
        {(selectedCategory || selectedSubcategory || selectedTechnology || searchQuery) && (
          <div className="flex flex-wrap items-center gap-3 bg-blue-50/60 border border-blue-100 p-4 rounded-2xl mb-8 animate-fadeIn">
            <span className="text-xs uppercase font-black tracking-widest text-blue-600">Active Filters:</span>
            
            {selectedCategory && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-200 text-xs font-bold text-blue-700 rounded-full shadow-sm">
                Category: <strong className="text-blue-900">{selectedCategory}</strong>
                <button 
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedSubcategory(null);
                  }}
                  className="hover:text-red-500 hover:bg-gray-100 rounded-full p-0.5 ml-1 transition-colors"
                  title="Remove Category"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            
            {selectedSubcategory && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-200 text-xs font-bold text-blue-700 rounded-full shadow-sm">
                Sub-category: <strong className="text-blue-900">{selectedSubcategory}</strong>
                <button 
                  onClick={() => setSelectedSubcategory(null)}
                  className="hover:text-red-500 hover:bg-gray-100 rounded-full p-0.5 ml-1 transition-colors"
                  title="Remove Sub-category"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedTechnology && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-200 text-xs font-bold text-blue-700 rounded-full shadow-sm">
                Technology: <strong className="text-blue-900">{selectedTechnology}</strong>
                <button 
                  onClick={() => setSelectedTechnology(null)}
                  className="hover:text-red-500 hover:bg-gray-100 rounded-full p-0.5 ml-1 transition-colors"
                  title="Remove Tech Filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-200 text-xs font-bold text-blue-700 rounded-full shadow-sm">
                Search: <strong className="text-blue-900">"{searchQuery}"</strong>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="hover:text-red-500 hover:bg-gray-100 rounded-full p-0.5 ml-1 transition-colors"
                  title="Clear Search"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            <button
              onClick={() => {
                setSelectedCategory(null);
                setSelectedSubcategory(null);
                setSelectedTechnology(null);
                setSearchQuery('');
              }}
              className="text-xs font-black uppercase text-red-600 hover:text-white hover:bg-red-600 transition-all ml-auto bg-white hover:border-red-600 px-3 py-1.5 rounded-xl border border-red-200 shadow-sm"
            >
              Clear All / Reset
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-100 animate-pulse h-96 rounded-3xl" />
            ))}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {filteredProducts.map((product: any) => (
                <ProductCard key={product._id} product={product} onBuy={onBuy} onClick={() => onProductClick(product)} />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
                <LayoutDashboard className="mx-auto text-gray-300 mb-4 animate-bounce" size={48} />
                <h3 className="text-xl font-bold text-gray-800">No websites match your filters.</h3>
                <p className="text-sm text-gray-500 mt-1">Try resetting the categories or search term to see more templates.</p>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedSubcategory(null);
                    setSelectedTechnology(null);
                    setSearchQuery('');
                  }}
                  className="mt-6 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-colors"
                >
                  Show All
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Trust Badges */}
      <section className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 mt-20">
        <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
            <ShieldCheck />
          </div>
          <div>
            <h3 className="text-lg">Premium Quality</h3>
            <p className="text-sm text-gray-500">Handpicked source code</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
            <TrendingUp />
          </div>
          <div>
            <h3 className="text-lg">Scalable Architecture</h3>
            <p className="text-sm text-gray-500">Built for high traffic</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
            <CheckCircle2 />
          </div>
          <div>
            <h3 className="text-lg">Full Support</h3>
            <p className="text-sm text-gray-500">24/7 technical assistance</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
            <DollarSign />
          </div>
          <div>
            <h3 className="text-lg">Instant Delivery</h3>
            <p className="text-sm text-gray-500">Pay and download now</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="hidden md:block max-w-7xl mx-auto px-4 py-20 bg-blue-600 rounded-[48px] overflow-hidden relative my-20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full -ml-48 -mb-48 blur-3xl" />
        
        <div className="relative z-10 text-white">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display mb-4">How to Launch Your Site?</h2>
            <p className="text-blue-100 max-w-xl mx-auto">Get your business online in three simple steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { step: '01', title: 'Choose Template', desc: 'Browse our extensive library of premium website templates.' },
              { step: '02', title: 'Quick Purchase', desc: 'Secure payment through local gateways like bKash, Rocket, or Nagad.' },
              { step: '03', title: 'Instant Delivery', desc: 'Get source code and start your deployment within minutes.' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20">
                <div className="text-5xl font-black text-white/20 mb-4">{item.step}</div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-blue-100 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductCard({ product, onBuy, onClick }: any) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      onClick={onClick}
      className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer"
    >
      <div className="relative h-60 overflow-hidden">
        <img 
          src={product.imageUrl || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60"} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
          alt={product.name}
        />
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold text-blue-600 shadow-sm uppercase tracking-wider">
            Verified Build
          </span>
        </div>
        <div className="absolute top-4 right-4 group-hover:opacity-100 opacity-0 transition-opacity">
          <button className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-gray-600 hover:text-red-500 transition-colors">
            <Facebook size={18} />
          </button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold group-hover:text-blue-600 transition-colors uppercase tracking-tight line-clamp-1 flex-1 mr-4">{product.name}</h3>
          <span className="text-2xl font-display font-bold text-gray-900 flex-shrink-0">৳{product.price}</span>
        </div>
      </div>
    </motion.div>
  );
}

// --- Admin Panel ---

function AdminPanel({ onProductAdded }: { onProductAdded?: () => void }) {
  const [activeTab, setActiveTab] = useState<'users' | 'orders' | 'products' | 'sales' | 'guide-packs' | 'payment-methods'>('products');
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // New admin states for guide packages and gateways
  const [guidePacks, setGuidePacks] = useState<GuidePack[]>([]);
  const [paymentConfigs, setPaymentConfigs] = useState<PaymentConfig[]>([]);
  const [editingPack, setEditingPack] = useState<GuidePack | null>(null);

  const fetchConfigs = useCallback(async () => {
    try {
      const [packRes, payRes] = await Promise.all([
        fetch('/api/configs/guide-packs'),
        fetch('/api/configs/payments')
      ]);
      if (packRes.ok) {
        const packs = await packRes.json();
        setGuidePacks(packs);
      }
      if (payRes.ok) {
        const pays = await payRes.json();
        setPaymentConfigs(pays);
      }
    } catch (err) {
      console.error("Failed to fetch configs standard:", err);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const fetchData = useCallback(async () => {
    try {
      const endpoints = ['/api/users', '/api/orders', '/api/products', '/api/sales'];
      const results = await Promise.all(endpoints.map(url => fetch(url).then(async r => {
        let data;
        try {
          data = await r.json();
        } catch (e) {
          throw new Error(`Invalid response from ${url}`);
        }
        
        if (!r.ok) {
          throw new Error(data.message || data.error || `Server returned ${r.status} for ${url}`);
        }
        return data;
      })));
      
      const [u, o, p, s] = results;
      setUsers(Array.isArray(u) ? u : []);
      setOrders(Array.isArray(o) ? o : []);
      setProducts(Array.isArray(p) ? p : []);
      setSales(Array.isArray(s) ? s : []);
      
    } catch (err: any) {
      console.error("Fetch admin data error:", err);
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        toast.error("Admin: Network error - check server status");
      } else {
        toast.error(`Admin Error: ${err.message || "Failed to load data"}`);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = [
    { label: 'Total Sales', value: `$${sales.reduce((acc, s) => acc + s.amount, 0)}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Orders', value: orders.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Products', value: products.length, icon: LayoutDashboard, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Users', value: users.length, icon: UsersIcon, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h2 className="text-4xl mb-1">Administrative Overview</h2>
          <p className="text-gray-500">Manage your marketplace, users and monitor business performance.</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus size={20} />
          List New Website
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
              <stat.icon size={24} />
            </div>
            <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
            <h3 className="text-3xl font-display">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 flex-wrap">
          {[
            { id: 'products', label: 'Marketplace Inventory', icon: LayoutDashboard },
            { id: 'users', label: 'User Directory', icon: UsersIcon },
            { id: 'orders', label: 'Order History', icon: Package },
            { id: 'sales', label: 'Revenue Streams', icon: TrendingUp },
            { id: 'guide-packs', label: 'Guide Packs', icon: Edit2 },
            { id: 'payment-methods', label: 'Payment Methods', icon: Package },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-[150px] py-5 px-6 flex items-center justify-center gap-3 font-semibold transition-all border-b-2 ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-8">
          {activeTab === 'products' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(p => (
                <div key={p._id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={p.imageUrl || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60"} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
                    <div>
                      <p className="font-bold">{p.name}</p>
                      <p className="text-sm text-gray-500">${p.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      className="text-blue-500 hover:bg-blue-50"
                      onClick={() => {
                        setEditingProduct(p);
                        setShowEditModal(true);
                      }}
                    >
                      <Edit2 size={18} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="text-red-500 hover:bg-red-50"
                      onClick={async () => {
                        if (window.confirm(`Delete ${p.name}?`)) {
                          try {
                            const res = await fetch(`/api/products/${p._id}`, { method: 'DELETE' });
                            if (res.ok) {
                              toast.success("Product deleted");
                              fetchData();
                            }
                          } catch (err) {
                            toast.error("Failed to delete");
                          }
                        }
                      }}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              {users.map(u => (
                <div key={u._id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200">
                      <UserIcon className="text-gray-400" />
                    </div>
                    <div>
                      <p className="font-bold">{u.firstName} {u.lastName}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase">
                    {u.role}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center bg-blue-55 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                <p className="text-sm font-semibold text-blue-800">
                  📌 Total Placed Orders: {orders.length}
                </p>
              </div>
              
              {orders.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No orders placed yet.</div>
              ) : (
                <div className="space-y-4">
                  {orders.map(o => {
                    const statusColors = {
                      pending: 'bg-yellow-101 bg-yellow-100 text-yellow-800 border-yellow-200',
                      confirmed: 'bg-green-101 bg-green-100 text-green-800 border-green-200',
                      rejected: 'bg-red-101 bg-red-100 text-red-800 border-red-200',
                      completed: 'bg-green-101 bg-green-100 text-green-800 border-green-200',
                      cancelled: 'bg-gray-101 bg-gray-102 bg-gray-100 text-gray-800 border-gray-200'
                    };
                    
                    return (
                      <div key={o._id} className="p-6 bg-white rounded-3xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
                          <div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-mono text-xs text-gray-400">ID: #{o._id}</span>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[o.status] || 'bg-gray-100'}`}>
                                {o.status.toUpperCase()}
                              </span>
                            </div>
                            <h4 className="text-lg font-bold text-gray-950 mt-1 uppercase">
                              {o.productId?.name || 'Unknown Website Template'}
                            </h4>
                            <p className="text-xs text-gray-500">
                              Ordered at {new Date(o.createdAt).toLocaleString()}
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Total Price Paid</p>
                            <p className="text-xl font-black text-blue-600">৳{o.amount}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm mb-6 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                          <div>
                            <p className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2">💻 Website Info</p>
                            <p><span className="text-gray-500">Name:</span> <strong className="text-gray-800">{o.productId?.name || 'N/A'}</strong></p>
                            <p><span className="text-gray-500">Base Price:</span> <strong className="text-gray-800">৳{o.productId?.price || 'N/A'}</strong></p>
                          </div>
                          
                          <div>
                            <p className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2">🎁 Guide Pack Option</p>
                            {o.selectedGuidePack ? (
                              <div>
                                <p><span className="text-gray-500">Pack:</span> <strong className="text-blue-600 font-bold">{o.selectedGuidePack.name}</strong></p>
                                <p><span className="text-gray-500">Price:</span> <strong className="text-gray-800">৳{o.selectedGuidePack.price}</strong></p>
                              </div>
                            ) : (
                              <p className="text-gray-400 italic">No Guide Pack Selected</p>
                            )}
                          </div>

                          <div>
                            <p className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2">📞 Customer Contact</p>
                            <p><span className="text-gray-500">Name:</span> <strong className="text-gray-800">{o.customerName || 'N/A'}</strong></p>
                            <p><span className="text-gray-500">Gmail:</span> <strong className="text-gray-800">{o.customerEmail || o.userEmail}</strong></p>
                            <p><span className="text-gray-500">WhatsApp:</span> <strong className="text-green-600 font-bold">{o.customerWhatsapp || '(None)'}</strong></p>
                          </div>

                          <div>
                            <p className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2">💳 Payment Method</p>
                            <p><span className="text-gray-500">Selected Gateway:</span> <strong className="uppercase text-indigo-600">{o.paymentMethod || 'N/A'}</strong></p>
                          </div>

                          <div>
                            <p className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2">🔗 Transaction Details</p>
                            <p><span className="text-gray-500">Sender Number:</span> <strong className="text-emerald-700 font-mono font-bold">{o.senderPhone || 'N/A'}</strong></p>
                            <p><span className="text-gray-500">TrxID:</span> <strong className="text-gray-800 font-mono tracking-wider">{o.transactionId || 'N/A'}</strong></p>
                          </div>
                        </div>

                        {/* Four actions requested by the user */}
                        <div className="flex flex-wrap items-center gap-3">
                          <button 
                            type="button"
                            onClick={() => {
                              if (o.productId) {
                                (window as any).setSelectedProduct?.(o.productId);
                              } else {
                                toast.error("Product information not found");
                              }
                            }}
                            className="px-4 py-2 text-xs font-bold bg-blue-50 hover:bg-blue-105 hover:bg-blue-100 text-blue-700 rounded-xl transition-all"
                          >
                            Check Product
                          </button>

                          <button 
                            type="button"
                            onClick={async () => {
                              try {
                                const r = await fetch(`/api/orders/${o._id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'confirmed' })
                                });
                                if (r.ok) {
                                  toast.success("Order confirmed successfully! Project code lock is now opened.");
                                  fetchData();
                                } else {
                                  toast.error("Failed to update status");
                                }
                              } catch (e) {
                                toast.error("Network error");
                              }
                            }}
                            className="px-4 py-2 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            disabled={o.status === 'confirmed'}
                          >
                            Confirm Order
                          </button>

                          <button 
                            type="button"
                            onClick={async () => {
                              try {
                                const r = await fetch(`/api/orders/${o._id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'rejected' })
                                });
                                if (r.ok) {
                                  toast.success("Order rejected.");
                                  fetchData();
                                } else {
                                  toast.error("Failed to update status");
                                }
                              } catch (e) {
                                toast.error("Network error");
                              }
                            }}
                            className="px-4 py-2 text-xs font-bold bg-amber-65 bg-amber-600 hover:bg-amber-700 text-white border-none rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            disabled={o.status === 'rejected'}
                          >
                            Reject Order
                          </button>

                          <button 
                            type="button"
                            onClick={async () => {
                              if (window.confirm("Are you sure you want to delete this order permanently? This cannot be undone.")) {
                                try {
                                  const r = await fetch(`/api/orders/${o._id}`, {
                                    method: 'DELETE'
                                  });
                                  if (r.ok) {
                                    toast.success("Order deleted successfully!");
                                    fetchData();
                                  } else {
                                    toast.error("Failed to delete order");
                                  }
                                } catch (e) {
                                  toast.error("Network error");
                                }
                              }
                            }}
                            className="px-4 py-2 text-xs font-mono font-bold text-red-65 text-red-600 hover:bg-red-50 rounded-xl transition-all ml-auto"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="space-y-4">
              {sales.map(s => (
                <div key={s._id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <p className="font-bold">Revenue Inbound</p>
                      <p className="text-sm text-gray-500">From Order #{s.orderId?._id?.slice(-6)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-green-600 text-display">+৳{s.amount}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'guide-packs' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-xl font-bold text-gray-950">Configure Guide Packs</h3>
                <p className="text-sm text-gray-500">Edit features, photos, and prices of three available guide packages.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {guidePacks.map(gp => (
                  <div key={gp.key} className="bg-white rounded-3xl border border-gray-200 relative overflow-hidden flex flex-col p-6 shadow-sm">
                    {gp.images && gp.images[0] && (
                      <img src={gp.images[0]} alt={gp.name} className="w-full h-40 object-cover rounded-2xl mb-4" />
                    )}
                    <div className="flex-grow">
                      <span className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] bg-blue-50 px-2 py-1 rounded inline-block">
                        {gp.key} Package
                      </span>
                      <h4 className="text-xl font-bold text-gray-900 mt-2">{gp.name}</h4>
                      <p className="text-2xl font-black text-gray-900 mt-1">৳{gp.price}</p>
                      <p className="text-xs text-gray-500 mt-3 leading-relaxed italic line-clamp-4">"{gp.description}"</p>
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => setEditingPack(gp)}
                      className="mt-6 w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-all text-xs"
                    >
                      Edit Guide Pack
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payment-methods' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-xl font-bold text-gray-950">Payment Gateway Config</h3>
                <p className="text-sm text-gray-500">Enable or disable payment modes, and configure active accounts/phone numbers where customers send money.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paymentConfigs.map(pc => (
                  <div key={pc.method} className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-gray-900 uppercase tracking-tight">{pc.label}</h4>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const updated = !pc.isEnabled;
                            const r = await fetch(`/api/configs/payments/${pc.method}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ isEnabled: updated })
                            });
                            if (r.ok) {
                              toast.success(`${pc.label} status updated successfully!`);
                              fetchConfigs();
                            }
                          } catch (err) {
                            toast.error("Failed to update status");
                          }
                        }}
                        className={`px-3 py-1 text-xs font-bold rounded-full transition-all border ${pc.isEnabled ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}
                      >
                        {pc.isEnabled ? '● Active' : '○ Disabled'}
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-gray-400">Merchant instructions/Number where money is sent</label>
                      <textarea
                        defaultValue={pc.details}
                        onBlur={async (e) => {
                          const val = e.target.value;
                          try {
                            const r = await fetch(`/api/configs/payments/${pc.method}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ details: val })
                            });
                            if (r.ok) {
                              toast.success(`${pc.label} merchant details updated!`);
                              fetchConfigs();
                            }
                          } catch (err) {
                            toast.error("Failed to save changes");
                          }
                        }}
                        className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        placeholder="Configure instructions or account number..."
                      />
                      <p className="text-[10px] text-gray-400">💡 Auto-saves when you click outside the text area (on blur)</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <AddProductModal onClose={() => setShowAddModal(false)} onAdded={() => { fetchData(); onProductAdded?.(); }} />
        )}
        {showEditModal && editingProduct && (
          <EditProductModal 
            product={editingProduct} 
            onClose={() => {
              setShowEditModal(false);
              setEditingProduct(null);
            }} 
            onUpdated={() => {
              fetchData();
              onProductAdded?.();
            }} 
          />
        )}
        {editingPack && (
          <EditGuidePackModal 
            pack={editingPack} 
            onClose={() => setEditingPack(null)} 
            onUpdated={() => {
              fetchConfigs();
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EditProductModal({ product, onClose, onUpdated }: { product: Product, onClose: () => void, onUpdated: () => void }) {
  const [formData, setFormData] = useState({
    name: product.name,
    price: product.price.toString(),
    description: product.description,
    category: product.category,
    subcategory: product.subcategory,
    demoUrl: product.demoUrl || '',
    features: product.features || [{ text: '', imageUrl: '' }],
    benefits: product.benefits || [{ text: '', imageUrl: '' }],
    technologies: product.technologies || [] as string[],
  });
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [gallery, setGallery] = useState<File[]>([]);
  const [featureImages, setFeatureImages] = useState<(File | null)[]>(new Array(product.features?.length || 1).fill(null));
  const [benefitImages, setBenefitImages] = useState<(File | null)[]>(new Array(product.benefits?.length || 1).fill(null));
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('price', formData.price);
      data.append('description', formData.description);
      data.append('category', formData.category);
      data.append('subcategory', formData.subcategory);
      data.append('demoUrl', formData.demoUrl);
      data.append('technologies', JSON.stringify(formData.technologies));
      
      data.append('features', JSON.stringify(formData.features));
      data.append('benefits', JSON.stringify(formData.benefits));

      if (mainImage) data.append('mainImage', mainImage);
      
      gallery.forEach((file) => {
        data.append('gallery', file);
      });

      featureImages.forEach((file, index) => {
        if (file) {
          const renamedFile = new File([file], `feat_${index}_${file.name}`, { type: file.type });
          data.append('featureImages', renamedFile);
        }
      });

      benefitImages.forEach((file, index) => {
        if (file) {
          const renamedFile = new File([file], `ben_${index}_${file.name}`, { type: file.type });
          data.append('benefitImages', renamedFile);
        }
      });

      const res = await fetch(`/api/products/${product._id}`, { method: 'PUT', body: data });
      let result: any = {};
      try {
        result = await res.json();
      } catch (parseErr) {
        console.error("Failed to parse response JSON from update API", parseErr);
      }
      
      if (!res.ok) {
        throw new Error(result.error || `Failed to update website (Status ${res.status})`);
      }

      toast.success("Website updated successfully!");
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Update Error:", err);
      toast.error(err.message || "Failed to update website");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto px-4 py-10">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden mx-auto"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">Edit Prototype: {product.name}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Website Name" placeholder="e.g. Modern E-commerce" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
            <Input label="Price (USD)" type="number" placeholder="599" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 font-display">Category</label>
              <select 
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                required
              >
                <option value="">Select Category</option>
                {CATEGORIES.map((cat, idx) => (
                  <option key={idx} value={cat.name}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 font-display">Sub-category</label>
              <select 
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 disabled:bg-gray-50 disabled:text-gray-400"
                value={formData.subcategory}
                onChange={e => setFormData({ ...formData, subcategory: e.target.value })}
                required
                disabled={!formData.category}
              >
                <option value="">Select Sub-category</option>
                {formData.category && CATEGORIES.find(c => c.name === formData.category)?.groups.flatMap(g => g.items).map((item, idx) => (
                  <option key={idx} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold text-gray-700 font-display flex items-center gap-2">
              <Globe size={18} className="text-blue-600" />
              Technologies Used
            </label>
            <div className="flex flex-wrap gap-2">
              {TECHNOLOGIES.map(tech => (
                <button
                  key={tech}
                  type="button"
                  onClick={() => {
                    const isSelected = formData.technologies.includes(tech);
                    const newTechs = isSelected
                      ? formData.technologies.filter(t => t !== tech)
                      : [...formData.technologies, tech];
                    setFormData({ ...formData, technologies: newTechs });
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${
                    formData.technologies.includes(tech)
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                      : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  {tech}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Cover Banner (Optional update)</label>
              <input type="file" accept="image/*" onChange={e => setMainImage(e.target.files?.[0] || null)} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Gallery (Multiple Photos - Optional update)</label>
              <input type="file" accept="image/*" multiple onChange={e => setGallery(Array.from(e.target.files || []))} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Detailed Description</label>
            <textarea 
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px]"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-4 p-8 bg-gray-50 sticky bottom-0 z-10 border-t border-gray-100">
            <Button variant="ghost" className="flex-1 py-4" onClick={onClose} type="button">Cancel</Button>
            <Button className="flex-[2] py-4 shadow-xl shadow-blue-500/20" disabled={loading} type="submit">
              {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Update Website Listing"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

const TECHNOLOGIES = [
  'HTML', 'Vue.js', 'React.js', 'JavaScript', 'CSS', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js', 'Node.js', 
  'Python', 'PHP', 'Ruby', 'Rust', 'Go', 'C#', 'Java', 'Kotlin', 'Swift', 'Perl', 'Scala', 'TypeScript',
  'MongoDB', 'MySQL', 'PostgreSQL', 'Firebase', 'SQLite', 'Redis', 'Microsoft SQL Server', 'Oracle Database', 'MariaDB', 'Cassandra', 'DynamoDB', 'Supabase', 'CouchDB', 'Elasticsearch', 'PlanetScale',
  'Cloudinary', 'ImageKit', 'Uploadcare', 'Imgix', 'Bunny.net', 'Sirv', 'Filestack', 'Transloadit'
];

function AddProductModal({ onClose, onAdded }: { onClose: () => void, onAdded: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    subcategory: '',
    demoUrl: '',
    features: [{ text: '', imageUrl: '' }],
    benefits: [{ text: '', imageUrl: '' }],
    technologies: [] as string[],
  });
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [gallery, setGallery] = useState<File[]>([]);
  const [prototypeFiles, setPrototypeFiles] = useState<File[]>([]);
  const [featureImages, setFeatureImages] = useState<(File | null)[]>([]);
  const [benefitImages, setBenefitImages] = useState<(File | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setDbStatus(data.database === 'connected' ? 'connected' : 'disconnected');
      })
      .catch(() => setDbStatus('disconnected'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (dbStatus === 'disconnected') {
      toast.error("Cannot upload: Database is not connected. Check your MongoDB Atlas whitelist.");
      return;
    }
    
    setLoading(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('price', formData.price);
      data.append('description', formData.description);
      data.append('category', formData.category);
      data.append('subcategory', formData.subcategory);
      data.append('demoUrl', formData.demoUrl);
      data.append('technologies', JSON.stringify(formData.technologies));
      
      data.append('features', JSON.stringify(formData.features));
      data.append('benefits', JSON.stringify(formData.benefits));

      if (mainImage) data.append('image', mainImage);
      
      gallery.forEach((file) => {
        data.append('gallery', file);
      });

      prototypeFiles.forEach((file) => {
        data.append('prototypeFiles', file);
      });

      featureImages.forEach((file, index) => {
        if (file) {
          const renamedFile = new File([file], `feat_${index}_${file.name}`, { type: file.type });
          data.append('featureImages', renamedFile);
        }
      });

      benefitImages.forEach((file, index) => {
        if (file) {
          const renamedFile = new File([file], `ben_${index}_${file.name}`, { type: file.type });
          data.append('benefitImages', renamedFile);
        }
      });

      const res = await fetch('/api/products', { method: 'POST', body: data });
      const result = await res.json();
      
      if (!res.ok) {
        const errorMessage = result.details ? `${result.error}: ${result.details}` : (result.error || "Failed to list website");
        throw new Error(errorMessage);
      }

      toast.success("Website listed successfully!");
      onAdded();
      onClose();
    } catch (err: any) {
      console.error("Listing Error:", err);
      if (err.message === 'Failed to fetch') {
        toast.error("Network Error: Upload failed. The file might be too large (>100MB) or your connection was interrupted. Try a smaller zip.");
      } else {
        toast.error(err.message || "Failed to list website");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto px-4 py-10">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden mx-auto"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-6">
            <h3 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">List a New Prototype</h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
              <span className={`w-2 h-2 rounded-full ${
                dbStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                dbStatus === 'disconnected' ? 'bg-red-500' : 'bg-gray-300'
              }`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Connection: {dbStatus}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-10">
          {/* Section 1: Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Website Name" placeholder="e.g. Modern E-commerce LMS" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
            <Input label="Price (USD)" type="number" placeholder="599" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 font-display">Category</label>
              <select 
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                required
              >
                <option value="">Select Category</option>
                {CATEGORIES.map((cat, idx) => (
                  <option key={idx} value={cat.name}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 font-display">Sub-category</label>
              <select 
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 disabled:bg-gray-50 disabled:text-gray-400"
                value={formData.subcategory}
                onChange={e => setFormData({ ...formData, subcategory: e.target.value })}
                required
                disabled={!formData.category}
              >
                <option value="">Select Sub-category</option>
                {formData.category && CATEGORIES.find(c => c.name === formData.category)?.groups.flatMap(g => g.items).map((item, idx) => (
                  <option key={idx} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Links and Files */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Demo Link (URL)" placeholder="https://demo.example.com" value={formData.demoUrl} onChange={e => setFormData({ ...formData, demoUrl: e.target.value })} />
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Download Assets (Files/Folders/Apps/Images)</label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-indigo-500 px-2 py-0.5 bg-indigo-50 rounded-full font-bold uppercase tracking-widest">Multi-Support</span>
                </div>
              </div>
              <div className="relative group">
                <div className="flex flex-col gap-2">
                  <input 
                    type="file" 
                    multiple
                    accept="*/*"
                    onChange={e => {
                      const selectedFiles = Array.from(e.target.files || []) as File[];
                      if (prototypeFiles.length + selectedFiles.length > 100) {
                        toast.error("Maximum 100 files allowed for downloads.");
                        return;
                      }
                      const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
                      if (totalSize > 50 * 1024 * 1024) {
                        toast(`Total size (${(totalSize/1024/1024).toFixed(1)}MB). Please wait patiently during upload.`, { icon: 'ℹ️' });
                      }
                      setPrototypeFiles(prev => [...prev, ...selectedFiles]);
                    }}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all cursor-pointer"
                  />
                  
                  {prototypeFiles.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1 max-h-40 overflow-y-auto pr-1">
                      {prototypeFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg border border-blue-100 group/file">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Package size={14} className="text-blue-500 flex-shrink-0" />
                            <span className="text-[11px] font-bold text-blue-700 truncate">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-blue-400 whitespace-nowrap">{(file.size/1024/1024).toFixed(2)} MB</span>
                            <button 
                              type="button"
                              onClick={() => setPrototypeFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="p-1 hover:bg-blue-100 rounded text-blue-600 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button 
                         type="button" 
                         onClick={() => setPrototypeFiles([])}
                         className="text-[9px] font-black uppercase text-red-500 hover:text-red-600 text-right mt-1 tracking-widest"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">Any file (Zip, APK, PDF, images) supported. To upload folders, Zip them first. Max 500MB.</p>
            </div>
          </div>

          {/* Technologies Section */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-gray-700 font-display flex items-center gap-2">
              <Globe size={18} className="text-blue-600" />
              Technologies Used
            </label>
            <div className="flex flex-wrap gap-2">
              {TECHNOLOGIES.map(tech => (
                <button
                  key={tech}
                  type="button"
                  onClick={() => {
                    const isSelected = formData.technologies.includes(tech);
                    const newTechs = isSelected
                      ? formData.technologies.filter(t => t !== tech)
                      : [...formData.technologies, tech];
                    setFormData({ ...formData, technologies: newTechs });
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${
                    formData.technologies.includes(tech)
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                      : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  {tech}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400">Select all technologies used in this prototype. These will be visible to buyers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Cover Banner</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={e => setMainImage(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Gallery (Multiple Photos)</label>
              <input 
                type="file" 
                accept="image/*" 
                multiple
                onChange={e => setGallery(Array.from(e.target.files || []))}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Section 3: Rich Content */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Detailed Description</label>
            <textarea 
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px]"
              placeholder="Explain what this website does and who it's for..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="space-y-6">
            <h4 className="font-bold border-b pb-2 text-blue-600 flex items-center gap-2">
              <Package size={20} /> Key Features
            </h4>
            {formData.features.map((f, i) => (
              <div key={i} className="p-5 bg-gray-50 rounded-2xl space-y-4 border border-gray-200 group">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 font-mono tracking-widest uppercase">Feature #{i + 1}</span>
                  {formData.features.length > 1 && (
                    <button type="button" onClick={() => {
                      const newFeatures = formData.features.filter((_, idx) => idx !== i);
                      const newImages = featureImages.filter((_, idx) => idx !== i);
                      setFormData({ ...formData, features: newFeatures });
                      setFeatureImages(newImages);
                    }} className="text-red-400 hover:text-red-600 p-1"><X size={18} /></button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-tighter">Description</label>
                    <textarea 
                      placeholder="Describe this feature..." 
                      value={f.text} 
                      onChange={e => {
                        const newFeatures = [...formData.features];
                        newFeatures[i].text = e.target.value;
                        setFormData({ ...formData, features: newFeatures });
                      }}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-tighter">Feature Media</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => {
                        const newImages = [...featureImages];
                        newImages[i] = e.target.files?.[0] || null;
                        setFeatureImages(newImages);
                      }}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                    />
                    <Input 
                      placeholder="OR paste image URL here..." 
                      value={f.imageUrl || ''} 
                      onChange={e => {
                        const newFeatures = [...formData.features];
                        newFeatures[i].imageUrl = e.target.value;
                        setFormData({ ...formData, features: newFeatures });
                      }} 
                      className="text-xs py-2"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full py-3 text-sm border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => {
              setFormData({ ...formData, features: [...formData.features, { text: '', imageUrl: '' }] });
              setFeatureImages([...featureImages, null]);
            }}>
              <Plus size={16} /> Add New Feature
            </Button>
          </div>

          <div className="space-y-6">
            <h4 className="font-bold border-b pb-2 text-indigo-600 flex items-center gap-2">
              <ShieldCheck size={20} /> Prime Benefits
            </h4>
            {formData.benefits.map((b, i) => (
              <div key={i} className="p-5 bg-gray-50 rounded-2xl space-y-4 border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 font-mono tracking-widest uppercase">Benefit #{i + 1}</span>
                  {formData.benefits.length > 1 && (
                    <button type="button" onClick={() => {
                      const newBenefits = formData.benefits.filter((_, idx) => idx !== i);
                      const newImages = benefitImages.filter((_, idx) => idx !== i);
                      setFormData({ ...formData, benefits: newBenefits });
                      setBenefitImages(newImages);
                    }} className="text-red-400 hover:text-red-600 p-1"><X size={18} /></button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-tighter">Value Proposition</label>
                    <textarea 
                      placeholder="Explain the benefit..." 
                      value={b.text} 
                      onChange={e => {
                        const newBenefits = [...formData.benefits];
                        newBenefits[i].text = e.target.value;
                        setFormData({ ...formData, benefits: newBenefits });
                      }}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-tighter">Benefit Visual</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => {
                        const newImages = [...benefitImages];
                        newImages[i] = e.target.files?.[0] || null;
                        setBenefitImages(newImages);
                      }}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                    />
                    <Input 
                      placeholder="OR paste image URL here..." 
                      value={b.imageUrl || ''} 
                      onChange={e => {
                        const newBenefits = [...formData.benefits];
                        newBenefits[i].imageUrl = e.target.value;
                        setFormData({ ...formData, benefits: newBenefits });
                      }} 
                      className="text-xs py-2"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full py-3 text-sm border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={() => {
              setFormData({ ...formData, benefits: [...formData.benefits, { text: '', imageUrl: '' }] });
              setBenefitImages([...benefitImages, null]);
            }}>
              <Plus size={16} /> Add New Benefit
            </Button>
          </div>

          <div className="flex gap-4 pt-4 sticky bottom-0 bg-white border-t border-gray-100 py-6 mt-12 shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.1)]">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" disabled={loading}>
              {loading ? "Optimizing Assets..." : "Confirm & List Prototype"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// --- Auth Modal ---

function AuthModal({ onClose, onAdminLogin }: any) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        // Special Admin handling
        if (formData.password === 'website@2008') {
          onAdminLogin();
          toast.success("Welcome back, Master Admin!");
          return;
        }
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        toast.success("Welcome back!");
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords don't match");
        }
        await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        toast.success("Account created successfully!");
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (provider: any) => {
    try {
      await signInWithPopup(auth, provider);
      toast.success("Success!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Social login failed");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden"
      >
        <div className="p-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-3xl font-display mb-1">{isLogin ? 'Sign In' : 'Create Account'}</h3>
              <p className="text-gray-500">Access the premium marketplace.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <button 
              onClick={() => handleSocialAuth(googleProvider)}
              className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all font-medium text-gray-700"
            >
              <Mail size={18} className="text-red-500" />
              Google
            </button>
            <button 
              onClick={() => handleSocialAuth(facebookProvider)}
              className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all font-medium text-gray-700"
            >
              <Facebook size={18} className="text-blue-600" />
              Facebook
            </button>
          </div>

          <div className="relative mb-8 text-center uppercase tracking-widest text-[10px] font-bold text-gray-400">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-100 -z-10" />
            <span className="bg-white px-4">Or continue with email</span>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="First Name" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} required />
                <Input placeholder="Last Name" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} required />
              </div>
            )}
            <Input placeholder="Email Address" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
            <div className="relative">
              <Input placeholder="Password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
              <Lock className="absolute right-4 top-[15px] text-gray-300" size={16} />
            </div>
            {!isLogin && (
              <Input placeholder="Confirm Password" type="password" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} required />
            )}

            <Button type="submit" className="w-full py-4 text-lg mt-4 shadow-xl shadow-blue-500/10" disabled={isLoading}>
              {isLoading ? 'Processing...' : (isLogin ? 'Sign In Securely' : 'Launch My Account')}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600">
            {isLogin ? "Don't have an account yet?" : "Already a member?"}{' '}
            <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 font-bold hover:underline">
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function ConsultationModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessType: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call for the user's specific request
    setTimeout(() => {
      toast.success("Consultation request received! We will contact you shortly.", {
        duration: 5000,
        icon: '📩'
      });
      setLoading(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-600 text-white">
          <div>
            <h3 className="text-xl font-bold">Free Consultation</h3>
            <p className="text-blue-100 text-xs mt-1">Talk directly with our experts</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Your Name" placeholder="Enter full name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            <Input label="Email" type="email" placeholder="email@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
          </div>
          <Input label="Phone Number" placeholder="017XXXXXXXX" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">What type of website do you want?</label>
            <select 
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              value={formData.businessType}
              onChange={e => setFormData({...formData, businessType: e.target.value})}
              required
            >
              <option value="">Select option</option>
              <option value="ecommerce">E-commerce</option>
              <option value="portfolio">Portfolio</option>
              <option value="news">News Portal</option>
              <option value="educational">Educational Institution</option>
              <option value="corporate">Corporate Website</option>
              <option value="others">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Write about your requirements</label>
            <textarea 
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
              placeholder="Describe your requirements in detail..."
              value={formData.message}
              onChange={e => setFormData({...formData, message: e.target.value})}
              required
            />
          </div>
          <Button type="submit" className="w-full py-4 mt-6 text-lg shadow-lg shadow-blue-600/20" disabled={loading}>
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </div>
            ) : 'Send Request'}
          </Button>
          <p className="text-center text-xs text-gray-400 mt-4 italic">
            One of our representatives will contact you within 24 hours.
          </p>
        </form>
      </motion.div>
    </div>
  );
}

// --- Footer ---

function Footer() {
  return (
    <footer className="bg-indigo-950 text-white pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
        <div className="col-span-1 md:col-span-1 space-y-8">
          <div className="flex items-center gap-3">
            <img 
              src="https://i.ibb.co.com/5zYdzSr/Gemini-Generated-Image-3r4ci43r4ci43r4c.png" 
              alt="Website Bazer Logo" 
              className="w-12 h-12 rounded-2xl object-cover shadow-xl shadow-blue-500/20"
            />
            <span className="text-2xl font-display font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Website Bazer</span>
          </div>
          <p className="text-indigo-200/60 leading-relaxed font-medium">
            Bangladesh's #1 marketplace for premium ready-made websites. 
            Join thousands of successful digital entrepreneurs.
          </p>
          <div className="flex gap-4">
            <a href="#" className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 hover:scale-110 transition-all border border-white/10"><Facebook size={20} /></a>
            <a href="#" className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 hover:scale-110 transition-all border border-white/10"><Mail size={20} /></a>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-bold mb-8 tracking-tight">Marketplace</h4>
          <ul className="space-y-4 text-indigo-100/60 font-medium">
            <li><a href="#" className="hover:text-blue-400 hover:translate-x-1 transition-all inline-block">E-commerce Solutions</a></li>
            <li><a href="#" className="hover:text-blue-400 hover:translate-x-1 transition-all inline-block">Learning Hubs</a></li>
            <li><a href="#" className="hover:text-blue-400 hover:translate-x-1 transition-all inline-block">Business Portfolios</a></li>
            <li><a href="#" className="hover:text-blue-400 hover:translate-x-1 transition-all inline-block">SaaS Prototypes</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-lg font-bold mb-8 tracking-tight">Support</h4>
          <ul className="space-y-4 text-indigo-100/60 font-medium">
            <li><a href="#" className="hover:text-blue-400 hover:translate-x-1 transition-all inline-block">Help Center</a></li>
            <li><a href="#" className="hover:text-blue-400 hover:translate-x-1 transition-all inline-block">Documentation</a></li>
            <li><a href="#" className="hover:text-blue-400 hover:translate-x-1 transition-all inline-block">Community</a></li>
            <li><a href="#" className="hover:text-blue-400 hover:translate-x-1 transition-all inline-block">Contact Sales</a></li>
          </ul>
        </div>

        <div className="space-y-8">
          <div>
            <h4 className="text-lg font-bold mb-8 tracking-tight">Newsletter</h4>
            <p className="text-indigo-100/60 mb-6 font-medium text-sm">Get the latest prototypes and digital tips.</p>
            <div className="flex gap-2">
              <input type="email" placeholder="Email address" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 grow text-sm" />
              <Button className="px-5 rounded-xl">Join</Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-indigo-100/40 text-sm font-medium">
        <p>&copy; {new Date().getFullYear()} Website Bazer. Built with ❤️ in Bangladesh.</p>
        <div className="flex gap-10">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Refunds</a>
        </div>
      </div>
    </footer>
  );
}

function ProductDetailModal({ product, onClose, onBuy, isUnlocked }: { product: Product, onClose: () => void, onBuy: () => void, isUnlocked?: boolean }) {
  const [activeImage, setActiveImage] = useState(product.imageUrl);
  const [isFeaturesExpanded, setIsFeaturesExpanded] = useState(false);
  const [isBenefitsExpanded, setIsBenefitsExpanded] = useState(false);
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);
  const images = [product.imageUrl, ...(product.gallery || [])].filter(Boolean);

  const featuresToShow = isFeaturesExpanded ? product.features : product.features?.slice(0, 2);
  const benefitsToShow = isBenefitsExpanded ? product.benefits : product.benefits?.slice(0, 2);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1100] bg-white overflow-y-auto flex flex-col"
    >
      {/* Header Overlay */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-white via-white/80 to-transparent z-[60] pointer-events-none" />
      
      <div className="flex items-center justify-between px-8 md:px-16 py-4 relative z-[70]">
        <div className="flex items-center gap-4">
          <img 
            src="https://i.ibb.co.com/5zYdzSr/Gemini-Generated-Image-3r4ci43r4ci43r4c.png" 
            alt="Logo" 
            className="w-10 h-10 rounded-xl"
          />
          <h2 className="text-xl font-display font-black text-indigo-950 uppercase tracking-tighter">
            Product <span className="text-blue-600">Details</span>
          </h2>
        </div>
        <button 
          onClick={onClose}
          className="p-3 bg-white hover:bg-gray-50 rounded-full text-gray-400 hover:text-red-500 shadow-2xl border border-gray-100 transition-all group active:scale-90"
        >
          <X size={28} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      <div className="flex-grow">
        <div className="max-w-[1400px] mx-auto">
          {/* Top Section: Side-by-Side Image and Essential Info */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16 p-8 md:p-16 items-start">
            
            {/* LEFT: Immersive Gallery Column */}
            <div className="lg:col-span-7">
              <div className="space-y-10">
                <div className="aspect-[3/2] rounded-[3rem] overflow-hidden bg-white shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] border border-gray-100 group relative">
                  <motion.img 
                    key={activeImage}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={activeImage} 
                    className="w-full h-full object-cover" 
                    alt={product.name} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/40 to-transparent" />
                  <div className="absolute bottom-6 left-6">
                    <span className="px-5 py-1.5 bg-white/20 backdrop-blur-xl text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-full border border-white/30">
                      Product Preview
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 justify-center">
                  {images.map((img, i) => (
                    <button 
                      key={i} 
                      onClick={() => setActiveImage(img)}
                      className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all duration-500 ${activeImage === img ? 'border-blue-600 ring-4 ring-blue-600/5 scale-110 shadow-xl' : 'border-transparent opacity-40 hover:opacity-100'}`}
                    >
                      <img src={img} className="w-full h-full object-cover" alt={`Thumb ${i}`} />
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: TrendingUp, label: "Efficiency", val: "Optimized", color: "blue" },
                    { icon: ShieldCheck, label: "Security", val: "Protected", color: "indigo" },
                    { icon: Package, label: "Structure", val: "Clean Code", color: "emerald" }
                  ].map((stat, i) => (
                    <div key={i} className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center group">
                      <stat.icon className={`text-${stat.color}-500 mb-2 group-hover:scale-110 transition-transform`} size={20} />
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</span>
                      <span className="text-[10px] font-bold text-gray-700">{stat.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Essential Product Info */}
            <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-8">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-5 py-2 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-[0.25em] shadow-xl shadow-blue-500/20">{product.category}</span>
                  <span className="px-5 py-2 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-[0.25em] border border-indigo-100">{product.subcategory}</span>
                </div>

                {product.technologies && product.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {product.technologies.map((tech, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-50 text-gray-400 text-[9px] font-black rounded-lg uppercase tracking-widest border border-gray-100">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
                
                <h2 className="text-4xl md:text-5xl font-display text-gray-950 tracking-tight leading-[1] font-black uppercase">
                  {product.name}
                </h2>
                
                <div className="flex flex-wrap items-center gap-4">
                  <div className="bg-indigo-950 px-8 py-4 rounded-3xl shadow-xl">
                    <span className="text-[9px] font-bold text-blue-400 block uppercase tracking-widest mb-1">Exclusive Price</span>
                    <span className="text-3xl font-display font-black text-white">৳{product.price}</span>
                  </div>
                  <div className="bg-green-50 px-5 py-4 rounded-2xl border border-green-100 flex items-center text-green-700 font-black text-[9px] uppercase tracking-widest">
                    <CheckCircle className="mr-2" size={16} /> Verified Build
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Button className="py-5 text-lg rounded-2xl shadow-xl shadow-blue-600/30 font-black h-auto group" onClick={onBuy}>
                  Configure & Buy Now
                  <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                </Button>
                {product.demoUrl && (
                  <a href={product.demoUrl} target="_blank" rel="noreferrer" className="block">
                    <Button variant="outline" className="w-full py-5 text-lg rounded-2xl border-gray-200 text-indigo-950 hover:bg-white hover:shadow-md flex items-center justify-center gap-3 font-black transition-all group h-auto">
                      Explore Live Demo
                      <ExternalLink size={18} className="group-hover:scale-125 transition-transform" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-[1100px] mx-auto p-8 md:px-16 space-y-32 pb-32">
            {/* Features Section */}
            <div className="space-y-12">
              <div className="flex items-center gap-4">
                <div className="h-0.5 w-12 bg-blue-600" />
                <h4 className="text-sm font-black text-blue-600 uppercase tracking-[0.3em]">Core Technologies & Features</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                {featuresToShow?.map((feat, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group"
                  >
                    <div className="flex flex-col gap-6 items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500 shadow-sm border border-indigo-100">
                          <span className="text-sm font-black">{i + 1}</span>
                        </div>
                        <p className="text-lg text-gray-900 font-bold leading-tight line-clamp-2">{feat.text}</p>
                      </div>
                      {feat.imageUrl && (
                        <div 
                          className="rounded-[2rem] overflow-hidden shadow-xl border border-gray-100 w-full bg-white relative group/img cursor-zoom-in"
                          onClick={() => setSelectedFullImage(feat.imageUrl!)}
                        >
                          <img src={feat.imageUrl} className="w-full h-auto block transition-transform duration-[2s] group-hover/img:scale-105" alt="Feature" />
                          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                            <div className="p-3 bg-white/90 backdrop-blur-md rounded-full shadow-2xl scale-50 group-hover/img:scale-100 transition-all duration-300">
                              <Search size={24} className="text-blue-600" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
              {product.features && product.features.length > 2 && (
                <div className="flex justify-center pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsFeaturesExpanded(!isFeaturesExpanded)}
                    className="rounded-2xl px-8 border-blue-100 text-blue-600 hover:bg-blue-50 font-black uppercase tracking-widest text-[10px]"
                  >
                    {isFeaturesExpanded ? 'See Less' : `See More (${product.features.length - 2} More)`}
                  </Button>
                </div>
              )}
            </div>

            {/* Benefits Section */}
            <div className="space-y-12">
              <div className="flex items-center gap-4">
                <div className="h-0.5 w-12 bg-indigo-600" />
                <h4 className="text-sm font-black text-indigo-600 uppercase tracking-[0.3em]">Value Propositions & Benefits</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                {benefitsToShow?.map((ben, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group"
                  >
                    <div className="flex flex-col gap-6 items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-950 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-indigo-500/20">
                          <CheckCircle size={20} />
                        </div>
                        <p className="text-lg text-gray-900 font-bold leading-tight line-clamp-2">{ben.text}</p>
                      </div>
                      {ben.imageUrl && (
                        <div 
                          className="rounded-[2rem] overflow-hidden shadow-xl border border-gray-100 w-full bg-white relative group/img cursor-zoom-in"
                          onClick={() => setSelectedFullImage(ben.imageUrl!)}
                        >
                          <img src={ben.imageUrl} className="w-full h-auto block transition-transform duration-[2s] group-hover/img:scale-105" alt="Benefit" />
                          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                            <div className="p-3 bg-white/90 backdrop-blur-md rounded-full shadow-2xl scale-50 group-hover/img:scale-100 transition-all duration-300">
                              <Search size={24} className="text-indigo-600" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
              {product.benefits && product.benefits.length > 2 && (
                <div className="flex justify-center pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsBenefitsExpanded(!isBenefitsExpanded)}
                    className="rounded-2xl px-8 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-black uppercase tracking-widest text-[10px]"
                  >
                    {isBenefitsExpanded ? 'See Less' : `See More (${product.benefits.length - 2} More)`}
                  </Button>
                </div>
              )}
            </div>

            {/* Detailed Description Box */}
            <div className="space-y-12">
              <div className="flex items-center gap-4">
                <div className="h-0.5 w-12 bg-blue-600" />
                <h4 className="text-sm font-black text-blue-600 uppercase tracking-[0.3em]">Detailed Description</h4>
              </div>
              <div className="p-10 md:p-16 bg-gray-50 rounded-[3rem] border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                  <Globe size={240} />
                </div>
                <p className="text-2xl font-medium text-gray-700 leading-relaxed relative z-10 italic">
                  "{product.description}"
                </p>
              </div>
            </div>

            {/* Project Handover Section */}
            {(product.downloadUrl || (product.downloadFiles && product.downloadFiles.length > 0)) && (
              <div className="p-10 md:p-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-900 rounded-[4rem] text-white overflow-hidden relative group">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-[120px] group-hover:scale-150 transition-transform duration-[5s]" />
                <div className="relative z-10 space-y-12">
                  <div className="flex flex-col md:flex-row items-center gap-12">
                    <div className="w-32 h-32 bg-white/20 backdrop-blur-2xl rounded-[2.5rem] flex items-center justify-center shadow-2xl">
                      {isUnlocked ? (
                        <CheckCircle className="text-green-400 animate-pulse" size={64} />
                      ) : (
                        <Download size={64} className="animate-pulse" />
                      )}
                    </div>
                    <div className="flex-grow text-center md:text-left">
                      <h4 className="text-4xl md:text-5xl font-black mb-3 uppercase tracking-tight">
                        {isUnlocked ? 'Project Handover Unlocked! 🎉' : 'Project Handover'}
                      </h4>
                      <p className="text-blue-100/80 text-xl font-medium">
                        {isUnlocked ? 'You have full verified access to download all your website assets and codes below.' : 'Full access to source code and assets.'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {product.downloadFiles && product.downloadFiles.length > 0 ? (
                      product.downloadFiles.map((file, idx) => (
                        isUnlocked ? (
                          <a 
                            key={idx}
                            href={`/api/download?url=${encodeURIComponent(file.url)}&name=${encodeURIComponent(file.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-6 bg-white/10 hover:bg-white/20 border border-white/20 rounded-[2rem] backdrop-blur-md transition-all group/dl cursor-pointer shadow-md"
                          >
                            <div className="flex items-center gap-5 overflow-hidden">
                              <Download size={28} className="text-green-400" />
                              <div className="overflow-hidden">
                                <p className="text-[10px] font-black uppercase text-blue-200 tracking-[0.2em] truncate">{file.name}</p>
                                <p className="text-base font-bold text-white truncate">Download File</p>
                              </div>
                            </div>
                            <ChevronRight size={20} className="text-white/60 group-hover/dl:translate-x-1 transition-transform" />
                          </a>
                        ) : (
                          <div 
                            key={idx}
                            className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-md transition-all group/dl opacity-70 cursor-not-allowed"
                          >
                            <div className="flex items-center gap-5 overflow-hidden">
                              <Lock size={28} className="text-white/40" />
                              <div className="overflow-hidden">
                                <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] truncate">{file.name}</p>
                                <p className="text-base font-medium text-white/60 truncate">Locked Content</p>
                              </div>
                            </div>
                            <Lock size={20} className="text-white/20" />
                          </div>
                        )
                      ))
                    ) : (
                      isUnlocked ? (
                        <a 
                          href={product.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-8 bg-white/10 hover:bg-white/20 border border-white/20 rounded-[2rem] backdrop-blur-md transition-all col-span-full group/dl cursor-pointer"
                        >
                          <div className="flex items-center gap-6">
                            <Download size={32} className="text-green-400 animate-bounce" />
                            <div>
                              <p className="text-[10px] font-black uppercase text-blue-200 tracking-[0.2em]">Full Project Source</p>
                              <p className="text-lg font-bold text-white">Download All Files (.zip)</p>
                            </div>
                          </div>
                          <ChevronRight size={24} className="text-white/60 group-hover/dl:translate-x-1 transition-transform" />
                        </a>
                      ) : (
                        <div 
                          className="flex items-center justify-between p-8 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-md transition-all col-span-full group/dl opacity-70 cursor-not-allowed"
                        >
                          <div className="flex items-center gap-6">
                            <Lock size={32} className="text-white/40" />
                            <div>
                              <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em]">Full Project Source</p>
                              <p className="text-lg font-medium text-white/60">Purchase to Access All Files</p>
                            </div>
                          </div>
                          <Lock size={24} className="text-white/20" />
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-32 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                  <Calendar size={32} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black text-gray-400 tracking-[0.2em] mb-1">Authenticated Entry</p>
                  <p className="text-lg font-black text-indigo-950">{new Date(product.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
              <button onClick={onClose} className="px-10 py-5 bg-gray-950 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:bg-red-600 hover:scale-105 flex items-center gap-3 group">
                Close Preview <X size={20} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="h-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-900" />

      {/* Image Lightbox Overlay */}
      <AnimatePresence>
        {selectedFullImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-12 cursor-zoom-out"
            onClick={() => setSelectedFullImage(null)}
          >
            <div className="absolute top-10 right-10 z-[2010]">
              <button 
                className="p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all border border-white/10"
                onClick={(e) => { e.stopPropagation(); setSelectedFullImage(null); }}
              >
                <X size={32} />
              </button>
            </div>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-full max-h-full overflow-hidden rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={selectedFullImage} 
                className="max-w-full max-h-[90vh] object-contain block" 
                alt="Full View" 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
