import { PrismaClient, UserRole, ItemCondition, ItemStatus, ProjectStatus, PricingType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.scheduleEvent.deleteMany();
  await prisma.projectItem.deleteMany();
  await prisma.inventoryHistory.deleteMany();
  await prisma.roomPackageItem.deleteMany();
  await prisma.roomPackage.deleteMany();
  await prisma.project.deleteMany();
  await prisma.property.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 12);

  // Create users
  const admin = await prisma.user.create({
    data: {
      name: "Jordan Rivera",
      email: "admin@stageflow.com",
      passwordHash,
      role: "ADMIN",
      phone: "(305) 555-0100",
    },
  });

  const officeUser = await prisma.user.create({
    data: {
      name: "Sarah Mitchell",
      email: "sarah@stageflow.com",
      passwordHash,
      role: "OFFICE",
      phone: "(305) 555-0101",
    },
  });

  const warehouseUser = await prisma.user.create({
    data: {
      name: "Mike Thompson",
      email: "mike@stageflow.com",
      passwordHash,
      role: "WAREHOUSE",
      phone: "(305) 555-0102",
    },
  });

  const crewUser1 = await prisma.user.create({
    data: {
      name: "Alex Martinez",
      email: "alex@stageflow.com",
      passwordHash,
      role: "CREW",
      phone: "(305) 555-0103",
    },
  });

  const crewUser2 = await prisma.user.create({
    data: {
      name: "Chris Johnson",
      email: "chris@stageflow.com",
      passwordHash,
      role: "CREW",
      phone: "(305) 555-0104",
    },
  });

  console.log("Created 5 users");

  // Create clients
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        companyName: "Coral Gables Realty",
        agentName: "Diana Vasquez",
        email: "diana@coralgablesrealty.com",
        phone: "(305) 555-0200",
        brokerage: "Coral Gables Realty Group",
        preferredStyle: "Modern Coastal",
        rating: 5,
      },
    }),
    prisma.client.create({
      data: {
        companyName: "South Beach Properties",
        agentName: "Marcus Chen",
        email: "marcus@sbproperties.com",
        phone: "(305) 555-0201",
        brokerage: "Keller Williams Miami Beach",
        preferredStyle: "Contemporary Luxury",
        rating: 4,
      },
    }),
    prisma.client.create({
      data: {
        companyName: "Brickell Living",
        agentName: "Amanda Foster",
        email: "amanda@brickellliving.com",
        phone: "(305) 555-0202",
        brokerage: "Compass Real Estate",
        preferredStyle: "Modern Minimalist",
        rating: 5,
      },
    }),
    prisma.client.create({
      data: {
        agentName: "Robert Blackwell",
        email: "robert.blackwell@gmail.com",
        phone: "(305) 555-0203",
        brokerage: "Coldwell Banker",
        preferredStyle: "Traditional Elegant",
        rating: 3,
      },
    }),
    prisma.client.create({
      data: {
        companyName: "Coconut Grove Homes",
        agentName: "Lisa Park",
        email: "lisa@cgrovehomes.com",
        phone: "(305) 555-0204",
        brokerage: "Douglas Elliman",
        preferredStyle: "Tropical Modern",
        rating: 4,
      },
    }),
    prisma.client.create({
      data: {
        agentName: "James Whitfield",
        email: "jwhitfield@remax.com",
        phone: "(305) 555-0205",
        brokerage: "RE/MAX Advance Realty",
        preferredStyle: "Coastal Casual",
        rating: 4,
      },
    }),
    prisma.client.create({
      data: {
        companyName: "Key Biscayne Estates",
        agentName: "Maria Gonzalez",
        email: "maria@kbestates.com",
        phone: "(305) 555-0206",
        brokerage: "ONE Sotheby's International",
        preferredStyle: "Mediterranean Modern",
        rating: 5,
      },
    }),
    prisma.client.create({
      data: {
        agentName: "Tom Richards",
        email: "trichards@berkshire.com",
        phone: "(305) 555-0207",
        brokerage: "Berkshire Hathaway",
        preferredStyle: "Modern Farmhouse",
        rating: 3,
      },
    }),
    prisma.client.create({
      data: {
        companyName: "Aventura Real Estate Group",
        agentName: "Natalie Brown",
        email: "natalie@aventuraregroup.com",
        phone: "(305) 555-0208",
        brokerage: "Aventura Real Estate Group",
        preferredStyle: "Ultra Modern",
        rating: 4,
      },
    }),
    prisma.client.create({
      data: {
        agentName: "David Kim",
        email: "dkim@compass.com",
        phone: "(305) 555-0209",
        brokerage: "Compass",
        preferredStyle: "Transitional",
        rating: 4,
      },
    }),
  ]);

  console.log("Created 10 clients");

  // Create properties
  const properties = await Promise.all([
    prisma.property.create({
      data: {
        clientId: clients[0].id,
        address: "1234 Coral Way",
        city: "Coral Gables",
        state: "FL",
        zip: "33134",
        sqft: 3200,
        bedrooms: 4,
        bathrooms: 3.5,
        listingPrice: 1250000,
        mlsNumber: "A11234567",
      },
    }),
    prisma.property.create({
      data: {
        clientId: clients[1].id,
        address: "800 Ocean Drive #PH1",
        city: "Miami Beach",
        state: "FL",
        zip: "33139",
        sqft: 4500,
        bedrooms: 3,
        bathrooms: 3,
        listingPrice: 3500000,
        mlsNumber: "A11234568",
      },
    }),
    prisma.property.create({
      data: {
        clientId: clients[2].id,
        address: "999 Brickell Bay Dr #4501",
        city: "Miami",
        state: "FL",
        zip: "33131",
        sqft: 2800,
        bedrooms: 3,
        bathrooms: 2.5,
        listingPrice: 1800000,
        mlsNumber: "A11234569",
      },
    }),
    prisma.property.create({
      data: {
        clientId: clients[3].id,
        address: "456 Biltmore Way",
        city: "Coral Gables",
        state: "FL",
        zip: "33134",
        sqft: 5000,
        bedrooms: 5,
        bathrooms: 4.5,
        listingPrice: 2750000,
      },
    }),
    prisma.property.create({
      data: {
        clientId: clients[4].id,
        address: "2100 S Bayshore Dr",
        city: "Coconut Grove",
        state: "FL",
        zip: "33133",
        sqft: 3800,
        bedrooms: 4,
        bathrooms: 3,
        listingPrice: 1950000,
        mlsNumber: "A11234570",
      },
    }),
    prisma.property.create({
      data: {
        clientId: clients[5].id,
        address: "350 Crandon Blvd #PH2",
        city: "Key Biscayne",
        state: "FL",
        zip: "33149",
        sqft: 2200,
        bedrooms: 2,
        bathrooms: 2,
        listingPrice: 1100000,
        mlsNumber: "A11234571",
      },
    }),
    prisma.property.create({
      data: {
        clientId: clients[6].id,
        address: "785 Crandon Blvd",
        city: "Key Biscayne",
        state: "FL",
        zip: "33149",
        sqft: 6200,
        bedrooms: 6,
        bathrooms: 5.5,
        listingPrice: 4200000,
        mlsNumber: "A11234572",
      },
    }),
  ]);

  console.log("Created 7 properties");

  // Create inventory items (50 items)
  const inventoryItems = [];
  const furnitureItems = [
    { name: "Modern Gray Sectional Sofa", subcategory: "Sofa", color: "Gray", styleTags: ["Modern", "Neutral"], purchaseCost: 2400, replacementValue: 3200, length: 120, width: 40, height: 34 },
    { name: "Coastal White Linen Sofa", subcategory: "Sofa", color: "White", styleTags: ["Coastal", "Neutral"], purchaseCost: 1800, replacementValue: 2500, length: 84, width: 36, height: 32 },
    { name: "Navy Blue Velvet Accent Chair", subcategory: "Chair", color: "Navy", styleTags: ["Modern", "Bold"], purchaseCost: 650, replacementValue: 900, length: 32, width: 34, height: 33 },
    { name: "Cream Bouclé Armchair", subcategory: "Chair", color: "Cream", styleTags: ["Modern", "Neutral"], purchaseCost: 800, replacementValue: 1100, length: 30, width: 32, height: 30 },
    { name: "Oak Round Dining Table (6-seat)", subcategory: "Dining Table", color: "Oak", styleTags: ["Modern", "Warm"], purchaseCost: 1600, replacementValue: 2200, length: 60, width: 60, height: 30 },
    { name: "White Marble Dining Table (8-seat)", subcategory: "Dining Table", color: "White", styleTags: ["Luxury", "Modern"], purchaseCost: 3200, replacementValue: 4500, length: 96, width: 42, height: 30 },
    { name: "Walnut Mid-Century Coffee Table", subcategory: "Coffee Table", color: "Walnut", styleTags: ["Mid-Century", "Warm"], purchaseCost: 550, replacementValue: 750, length: 48, width: 24, height: 16 },
    { name: "Glass & Gold Coffee Table", subcategory: "Coffee Table", color: "Gold", styleTags: ["Luxury", "Glam"], purchaseCost: 900, replacementValue: 1200, length: 52, width: 28, height: 18 },
    { name: "King Platform Bed Frame - Oak", subcategory: "Bed", color: "Oak", styleTags: ["Modern", "Warm"], purchaseCost: 1200, replacementValue: 1600, length: 80, width: 78, height: 48 },
    { name: "Queen Upholstered Bed - Gray", subcategory: "Bed", color: "Gray", styleTags: ["Modern", "Neutral"], purchaseCost: 950, replacementValue: 1300, length: 65, width: 63, height: 52 },
    { name: "White Dresser 6-Drawer", subcategory: "Dresser", color: "White", styleTags: ["Modern", "Neutral"], purchaseCost: 750, replacementValue: 1000, length: 60, width: 18, height: 34 },
    { name: "Walnut Nightstand Pair", subcategory: "Nightstand", color: "Walnut", styleTags: ["Modern", "Warm"], purchaseCost: 400, replacementValue: 600, length: 22, width: 16, height: 24 },
    { name: "Black Metal Console Table", subcategory: "Console Table", color: "Black", styleTags: ["Modern", "Industrial"], purchaseCost: 450, replacementValue: 650, length: 48, width: 14, height: 30 },
    { name: "Natural Wood Bookshelf", subcategory: "Bookshelf", color: "Natural", styleTags: ["Modern", "Warm"], purchaseCost: 680, replacementValue: 900, length: 36, width: 14, height: 72 },
    { name: "Leather Bar Stools (Set of 3)", subcategory: "Bar Stool", color: "Tan", styleTags: ["Modern", "Warm"], purchaseCost: 720, replacementValue: 1000, length: 18, width: 18, height: 42 },
  ];

  const artItems = [
    { name: "Abstract Ocean Canvas - Large", subcategory: "Canvas Art", color: "Blue", styleTags: ["Coastal", "Abstract"], purchaseCost: 350, replacementValue: 500, length: 48, width: 2, height: 36 },
    { name: "Modern Geometric Print Set (3pc)", subcategory: "Print Set", color: "Neutral", styleTags: ["Modern", "Geometric"], purchaseCost: 280, replacementValue: 400, length: 24, width: 2, height: 24 },
    { name: "Gold Sunburst Mirror - 36\"", subcategory: "Mirror", color: "Gold", styleTags: ["Glam", "Modern"], purchaseCost: 420, replacementValue: 600, length: 36, width: 3, height: 36 },
    { name: "Oversized Black Frame Mirror", subcategory: "Mirror", color: "Black", styleTags: ["Modern", "Neutral"], purchaseCost: 380, replacementValue: 550, length: 60, width: 3, height: 40 },
    { name: "Botanical Print Set (4pc)", subcategory: "Print Set", color: "Green", styleTags: ["Natural", "Traditional"], purchaseCost: 220, replacementValue: 320, length: 16, width: 1, height: 20 },
    { name: "Metal Wall Sculpture - Abstract", subcategory: "Wall Art", color: "Silver", styleTags: ["Modern", "Abstract"], purchaseCost: 480, replacementValue: 680, length: 42, width: 4, height: 30 },
    { name: "Coastal Photography Set (3pc)", subcategory: "Photography", color: "Neutral", styleTags: ["Coastal", "Photography"], purchaseCost: 320, replacementValue: 450, length: 20, width: 2, height: 16 },
    { name: "Minimalist Line Drawing - Framed", subcategory: "Print", color: "Black/White", styleTags: ["Modern", "Minimalist"], purchaseCost: 180, replacementValue: 260, length: 24, width: 2, height: 30 },
  ];

  const textileItems = [
    { name: "8x10 Ivory Jute Area Rug", subcategory: "Rug", color: "Ivory", styleTags: ["Coastal", "Neutral"], purchaseCost: 480, replacementValue: 650, length: 120, width: 96, height: 1 },
    { name: "5x7 Gray Geometric Rug", subcategory: "Rug", color: "Gray", styleTags: ["Modern", "Geometric"], purchaseCost: 320, replacementValue: 450, length: 84, width: 60, height: 1 },
    { name: "9x12 Navy Persian-Style Rug", subcategory: "Rug", color: "Navy", styleTags: ["Traditional", "Bold"], purchaseCost: 680, replacementValue: 950, length: 144, width: 108, height: 1 },
    { name: "Cream Linen Throw Pillows (4pc)", subcategory: "Pillow Set", color: "Cream", styleTags: ["Neutral", "Coastal"], purchaseCost: 120, replacementValue: 180, length: 20, width: 20, height: 6 },
    { name: "Blue Velvet Throw Pillows (4pc)", subcategory: "Pillow Set", color: "Blue", styleTags: ["Modern", "Bold"], purchaseCost: 140, replacementValue: 200, length: 20, width: 20, height: 6 },
    { name: "Chunky Knit Blanket - Ivory", subcategory: "Blanket", color: "Ivory", styleTags: ["Cozy", "Neutral"], purchaseCost: 90, replacementValue: 130, length: 60, width: 50, height: 3 },
    { name: "White Hotel-Style Duvet Set - King", subcategory: "Bedding", color: "White", styleTags: ["Classic", "Neutral"], purchaseCost: 200, replacementValue: 280, length: 86, width: 92, height: 4 },
    { name: "White Hotel-Style Duvet Set - Queen", subcategory: "Bedding", color: "White", styleTags: ["Classic", "Neutral"], purchaseCost: 180, replacementValue: 250, length: 86, width: 86, height: 4 },
    { name: "Linen Curtain Panels - Ivory (Pair)", subcategory: "Curtains", color: "Ivory", styleTags: ["Neutral", "Elegant"], purchaseCost: 160, replacementValue: 220, length: 52, width: 1, height: 96 },
  ];

  const accessoryItems = [
    { name: "Brushed Gold Table Lamp", subcategory: "Table Lamp", color: "Gold", styleTags: ["Modern", "Glam"], purchaseCost: 180, replacementValue: 260, length: 14, width: 14, height: 26 },
    { name: "Ceramic White Floor Lamp", subcategory: "Floor Lamp", color: "White", styleTags: ["Modern", "Neutral"], purchaseCost: 320, replacementValue: 450, length: 18, width: 18, height: 60 },
    { name: "Rattan Pendant Light", subcategory: "Pendant Light", color: "Natural", styleTags: ["Coastal", "Natural"], purchaseCost: 280, replacementValue: 400, length: 18, width: 18, height: 14 },
    { name: "Faux Fiddle Leaf Fig - 6ft", subcategory: "Plant", color: "Green", styleTags: ["Natural", "Modern"], purchaseCost: 150, replacementValue: 220, length: 24, width: 24, height: 72 },
    { name: "Faux Olive Tree - 5ft", subcategory: "Plant", color: "Green", styleTags: ["Mediterranean", "Natural"], purchaseCost: 130, replacementValue: 190, length: 20, width: 20, height: 60 },
    { name: "White Ceramic Vase Set (3pc)", subcategory: "Vase", color: "White", styleTags: ["Modern", "Neutral"], purchaseCost: 90, replacementValue: 130, length: 8, width: 8, height: 14 },
    { name: "Brass Decorative Tray", subcategory: "Tray", color: "Brass", styleTags: ["Glam", "Modern"], purchaseCost: 65, replacementValue: 95, length: 16, width: 12, height: 2 },
    { name: "Coffee Table Book Set (5pc)", subcategory: "Books", color: "Neutral", styleTags: ["Modern", "Styling"], purchaseCost: 80, replacementValue: 120, length: 12, width: 10, height: 10 },
    { name: "Glass Hurricane Candle Holders (3pc)", subcategory: "Candle Holder", color: "Clear", styleTags: ["Modern", "Elegant"], purchaseCost: 75, replacementValue: 110, length: 6, width: 6, height: 12 },
    { name: "Woven Storage Baskets (Set of 3)", subcategory: "Storage", color: "Natural", styleTags: ["Coastal", "Natural"], purchaseCost: 85, replacementValue: 120, length: 16, width: 12, height: 10 },
    { name: "Marble & Brass Bookends", subcategory: "Bookend", color: "White/Gold", styleTags: ["Luxury", "Modern"], purchaseCost: 55, replacementValue: 80, length: 5, width: 4, height: 7 },
    { name: "Faux Eucalyptus Arrangement", subcategory: "Floral", color: "Green", styleTags: ["Natural", "Modern"], purchaseCost: 45, replacementValue: 65, length: 12, width: 12, height: 18 },
    { name: "Brushed Gold Towel Set", subcategory: "Towels", color: "White/Gold", styleTags: ["Luxury", "Modern"], purchaseCost: 60, replacementValue: 85, length: 12, width: 8, height: 4 },
    { name: "Black Matte Soap Dispenser Set", subcategory: "Bath Accessory", color: "Black", styleTags: ["Modern", "Minimalist"], purchaseCost: 40, replacementValue: 60, length: 4, width: 4, height: 8 },
    { name: "Wooden Cutting Board Display Set", subcategory: "Kitchen Accessory", color: "Natural", styleTags: ["Warm", "Natural"], purchaseCost: 55, replacementValue: 80, length: 18, width: 12, height: 2 },
    { name: "Linen Table Runner - Oatmeal", subcategory: "Table Linen", color: "Oatmeal", styleTags: ["Neutral", "Coastal"], purchaseCost: 35, replacementValue: 50, length: 72, width: 14, height: 1 },
    { name: "Ceramic Dinner Set Display (4pc)", subcategory: "Tableware", color: "White", styleTags: ["Classic", "Modern"], purchaseCost: 70, replacementValue: 100, length: 11, width: 11, height: 8 },
    { name: "String Lights - Warm White", subcategory: "Lighting", color: "Warm White", styleTags: ["Cozy", "Modern"], purchaseCost: 25, replacementValue: 40, length: 20, width: 1, height: 1 },
  ];

  let seqNum = 1;

  const createItems = async (items: typeof furnitureItems, category: string) => {
    for (const item of items) {
      const prefix = category === "Furniture" ? "FRN" : category === "Art & Wall Decor" ? "ART" : category === "Rugs/Pillows/Linens" ? "RPL" : "LPA";
      const sku = `${prefix}-${String(seqNum).padStart(4, "0")}`;
      const conditions: ItemCondition[] = ["EXCELLENT", "EXCELLENT", "GOOD", "GOOD", "GOOD", "FAIR"];
      const statuses: ItemStatus[] = ["AVAILABLE", "AVAILABLE", "AVAILABLE", "STAGED", "AVAILABLE"];

      const created = await prisma.inventoryItem.create({
        data: {
          sku,
          name: item.name,
          description: `Premium ${item.subcategory.toLowerCase()} in ${item.color.toLowerCase()}`,
          category,
          subcategory: item.subcategory,
          length: item.length,
          width: item.width,
          height: item.height,
          color: item.color,
          styleTags: item.styleTags,
          purchaseCost: item.purchaseCost,
          purchaseDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          replacementValue: item.replacementValue,
          condition: conditions[Math.floor(Math.random() * conditions.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          currentLocation: "Warehouse",
        },
      });
      inventoryItems.push(created);
      seqNum++;
    }
  };

  await createItems(furnitureItems, "Furniture");
  await createItems(artItems, "Art & Wall Decor");
  await createItems(textileItems, "Rugs/Pillows/Linens");
  await createItems(accessoryItems, "Lighting/Plants/Accessories");

  console.log(`Created ${inventoryItems.length} inventory items`);

  // Create projects
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        propertyId: properties[0].id,
        clientId: clients[0].id,
        status: "ACTIVE",
        stageDate: new Date(2026, 1, 15),
        destageDate: new Date(2026, 4, 15),
        pricingType: "MONTHLY_RENTAL",
        totalPrice: 4500,
        notes: "High-end staging for luxury listing. Client wants coastal modern feel.",
        createdById: officeUser.id,
      },
    }),
    prisma.project.create({
      data: {
        propertyId: properties[1].id,
        clientId: clients[1].id,
        status: "STAGED",
        stageDate: new Date(2026, 2, 1),
        destageDate: new Date(2026, 5, 1),
        pricingType: "FLAT_FEE",
        totalPrice: 12000,
        notes: "Luxury penthouse staging. Full furnishing of all rooms.",
        createdById: officeUser.id,
      },
    }),
    prisma.project.create({
      data: {
        propertyId: properties[2].id,
        clientId: clients[2].id,
        status: "SCHEDULED",
        stageDate: new Date(2026, 2, 15),
        pricingType: "MONTHLY_RENTAL",
        totalPrice: 3200,
        notes: "Modern condo staging. Clean lines and minimal accessories.",
        createdById: admin.id,
      },
    }),
    prisma.project.create({
      data: {
        propertyId: properties[3].id,
        clientId: clients[3].id,
        status: "PROPOSAL",
        pricingType: "FLAT_FEE",
        totalPrice: 8500,
        notes: "Large home, needs full staging. Traditional with modern touches.",
        createdById: officeUser.id,
      },
    }),
    prisma.project.create({
      data: {
        propertyId: properties[4].id,
        clientId: clients[4].id,
        status: "CONSULTATION",
        notes: "Initial consultation scheduled. Client interested in tropical modern style.",
        createdById: officeUser.id,
      },
    }),
  ]);

  console.log("Created 5 projects");

  // Create room packages
  const packages = await Promise.all([
    prisma.roomPackage.create({
      data: {
        name: "Master Bedroom - Coastal",
        style: "Coastal",
        roomType: "Master Bedroom",
        description: "Complete master bedroom staging with coastal theme. Includes bed, nightstands, dresser, bedding, lamps, art, and accessories.",
        totalCost: 3800,
      },
    }),
    prisma.roomPackage.create({
      data: {
        name: "Living Room - Modern Luxury",
        style: "Modern Luxury",
        roomType: "Living Room",
        description: "Full living room setup with modern luxury aesthetic. Sectional sofa, coffee table, side table, rug, art, and styling accessories.",
        totalCost: 5200,
      },
    }),
    prisma.roomPackage.create({
      data: {
        name: "Dining Room - Contemporary",
        style: "Contemporary",
        roomType: "Dining Room",
        description: "Elegant dining room staging with contemporary feel. Dining table, chairs, centerpiece, art, and lighting.",
        totalCost: 3400,
      },
    }),
  ]);

  console.log("Created 3 room packages");

  // Create some schedule events
  await Promise.all([
    prisma.scheduleEvent.create({
      data: {
        projectId: projects[2].id,
        eventType: "STAGE",
        date: new Date(2026, 2, 15),
        startTime: "08:00",
        endTime: "14:00",
        notes: "Full staging install. 3rd floor condo - use service elevator.",
        crew: { connect: [{ id: crewUser1.id }, { id: crewUser2.id }] },
      },
    }),
    prisma.scheduleEvent.create({
      data: {
        projectId: projects[0].id,
        eventType: "DESTAGE",
        date: new Date(2026, 4, 15),
        startTime: "09:00",
        endTime: "13:00",
        notes: "Full destage. Lockbox code: 1234.",
        crew: { connect: [{ id: crewUser1.id }] },
      },
    }),
    prisma.scheduleEvent.create({
      data: {
        projectId: projects[4].id,
        eventType: "CONSULTATION",
        date: new Date(2026, 2, 5),
        startTime: "10:00",
        endTime: "11:00",
        notes: "Initial walkthrough with Lisa Park.",
      },
    }),
  ]);

  console.log("Created 3 schedule events");

  console.log("\nSeed completed successfully!");
  console.log("\nDemo accounts:");
  console.log("  Admin:     admin@stageflow.com / password123");
  console.log("  Office:    sarah@stageflow.com / password123");
  console.log("  Warehouse: mike@stageflow.com / password123");
  console.log("  Crew:      alex@stageflow.com / password123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
