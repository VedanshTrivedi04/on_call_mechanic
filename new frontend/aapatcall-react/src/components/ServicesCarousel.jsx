import { useEffect, useRef, useState } from "react";
import service1 from "../assets/images/service1.jpg";
import service2 from "../assets/images/service2.jpg";
import service3 from "../assets/images/service3.jpg";
import service4 from "../assets/images/service4.jpg";
import service5 from "../assets/images/service5.jpg";
import service6 from "../assets/images/service6.jpg";

export default function ServicesCarousel() {

  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(getVisibleCards());

  function getVisibleCards() {
    if (window.innerWidth <= 500) return 1;
    if (window.innerWidth <= 900) return 2;
    return 4;
  }

  const services = [
    { img: "/assets/images/service1.jpg", title: "Flat Tire Repair" },
    { img: "/assets/images/service2.jpg", title: "Battery Jumpstart" },
    { img: "/assets/images/service3.jpg", title: "Emergency Towing" },
    { img: "/assets/images/service4.jpg", title: "Fluid Delivery" },
    { img: "/assets/images/service6.jpg", title: "Scanning & Diagnostics" },
    { img: "/assets/images/service6.jpg", title: "Brake Repair" },
    { img: "/assets/images/service6.jpg", title: "Key & Lockout" },
    { img: "/assets/images/service6.jpg", title: "Minor On-site Fixes" },
  ];

  useEffect(() => {
    const handleResize = () => {
      setVisible(getVisibleCards());
      setIndex(0);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % Math.ceil(services.length / visible));
    }, 4000);

    return () => clearInterval(interval);
  }, [visible]);

  useEffect(() => {
    const cards = trackRef.current.children;
    if (!cards.length) return;

    const cardWidth = cards[0].offsetWidth + 16;
    trackRef.current.style.transform =
      `translateX(-${index * visible * cardWidth}px)`;
  }, [index, visible]);

  return (
    <section className="multi-carousel">

      <button className="arrow left"
        onClick={() => setIndex(i => i <= 0 ? Math.ceil(services.length / visible) - 1 : i - 1)}>
        &#10094;
      </button>

      <div className="carousel-wrapper">
        <div className="carousel-track" ref={trackRef}>

          {services.map((s, i) => (
            <div className="carousel-card" key={i}>
              <img src={s.img} />
              <h4>{s.title}</h4>
            </div>
          ))}

        </div>
      </div>

      <button className="arrow right"
        onClick={() => setIndex(i => (i + 1) % Math.ceil(services.length / visible))}>
        &#10095;
      </button>

    </section>
  );
}
