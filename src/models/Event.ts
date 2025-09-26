import mongoose, { Schema, Document } from 'mongoose';

export enum Currency {
    USD = 'USD',
    NGN = 'NGN',
    EUR = 'EUR',
    GBP = 'GBP',
    CAD = 'CAD',
    AUD = "AUD", // Australian Dollar
    JPY = "JPY", // Japanese Yen
    CNY = "CNY", // Chinese Yuan
    INR = "INR", // Indian Rupee
    BRL = "BRL", // Brazilian Real
    MXN = "MXN", // Mexican Peso
    RUB = "RUB", // Russian Ruble
    KRW = "KRW", // South Korean Won
    TRY = "TRY", // Turkish Lira
    ARS = "ARS", // Argentine Peso
    CLP = "CLP", // Chilean Peso
    COP = "COP", // Colombian Peso
    PEN = "PEN", // Peruvian Sol
    PHP = "PHP", // Philippine Peso 
    MYR = "MYR", // Malaysian Ringgit
    SGD = "SGD", // Singapore Dollar
    IDR = "IDR", // Indonesian Rupiah
    THB = "THB", // Thai Baht
    VND = "VND", // Vietnamese Dong
    AED = "AED", // United Arab Emirates Dirham
    SAR = "SAR", // Saudi Riyal
    QAR = "QAR", // Qatari Riyal
    KWD = "KWD", // Kuwaiti Dinar
    OMR = "OMR", // Omani Rial
    BHD = "BHD", // Bahraini Dinar
    JOD = "JOD", // Jordanian Dinar
    LBP = "LBP", // Lebanese Pound 
    ILS = "ILS", // Israeli New Shekel
    PKR = "PKR", // Pakistani Rupee
    BDT = "BDT", // Bangladeshi Taka
    LKR = "LKR", // Sri Lankan Rupee
    MUR = "MUR", // Mauritian Rupee
    TND = "TND", // Tunisian Dinar
    DZD = "DZD", // Algerian Dinar
  ZAR = "ZAR", // South African Rand
  GHS = "GHS", // Ghanaian Cedi
  KES = "KES", // Kenyan Shilling
  UGX = "UGX", // Ugandan Shilling
  TZS = "TZS", // Tanzanian Shilling
  RWF = "RWF", // Rwandan Franc
  ZMW = "ZMW", // Zambian Kwacha
  XOF = "XOF", // West African CFA Franc
  XAF = "XAF", // Central African CFA Franc
  EGP = "EGP", // Egyptian Pound
  MAD = "MAD", // Moroccan Dirham
  ETB = "ETB", // Ethiopian Birr
  MWK = "MWK", // Malawian Kwacha
  SLL = "SLL", // Sierra Leonean Leone
  LRD = "LRD", // Liberian Dollar
  CVE = "CVE", // Cape Verdean Escudo
  GMD = "GMD", // Gambian Dalasi
  GNF = "GNF", // Guinean Franc
  MRU = "MRU", // Mauritanian Ouguiya
  STN = "STN",
}

export interface IPrice {
    currency: Currency;
    amount: number;
}

export interface IPriceDocument extends IPrice, Document {}

export const PriceSchema = new Schema<IPriceDocument>({
    currency: {
        type: String,
        enum: Object.values(Currency),
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
});
export interface IEvent extends Document {
    name: string;
    date: Date;
    time: string;
    description: string;
    bannerUrl: string;
    watermarkUrl: string;
    createdBy: mongoose.Types.ObjectId;
    updatedBy: mongoose.Types.ObjectId;
    deletedBy: mongoose.Types.ObjectId;
    publishedBy: mongoose.Types.ObjectId;
    unpublishedBy: mongoose.Types.ObjectId;
    published: boolean
    prices: IPrice[];
    haveBroadcastRoom: boolean;
    broadcastSoftware: string;
    scheduledTestDate: Date;
    trailerUrl: string;
    status: EventStatus,
    rejectionReason: string,
    adminStatus: AdminStatus;
    ivsChannelArn: string,
    ivsPlaybackUrl: string | undefined,
    ivsSavedBroadcastUrl: string, 
    ivsChatRoomArn: string,
    rejectedBy: mongoose.Types.ObjectId;
    startedEventBy: mongoose.Types.ObjectId
    endedEventBy: mongoose.Types.ObjectId
    canWatchSavedStream: boolean;
    ivsIngestEndpoint: string | undefined;
    ivsIngestStreamKey: string | undefined;
    isDeleted: boolean;
    deletedAt: Date | undefined;
    timezone: string;
}

export enum EventStatus {
    UPCOMING = 'Upcoming',
    LIVE = 'Live',
    PAST = 'Past'
}

export enum AdminStatus {
    APPROVED = 'Approved',
    PENDING = 'Pending',
    REJECTED = 'Rejected'
}

const EventSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        date: { type: Date, required: true },
        time: { type: String, required: true },
        description: { type: String, required: true },
        bannerUrl: { type: String },
        watermarkUrl: { type: String },
        prices: { type: [PriceSchema], default: [] },
        published: { type: Boolean, default: false },
        status: { type: String, default: EventStatus.UPCOMING },
        adminStatus: { type: String, default: AdminStatus.PENDING },
        createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'createdByModel'
        },
        deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'createdByModel'
        },
        createdByModel: {
        type: String,
        enum: ['User', 'Admin'],
        default: 'User'
        },
        haveBroadcastRoom: { type: Boolean, required: true},
        canWatchSavedStream: { type: Boolean, default: false},
        broadcastSoftware: { type: String, required: true },
        scheduledTestDate: { type: Date, required: true },
        trailerUrl: { type: String },
        ivsChannelArn: { type: String },
        ivsPlaybackUrl: { type: String },
        ivsChatRoomArn: { type: String },
        timezone: {type: String },
        ivsIngestEndpoint: { type: String },
        ivsSavedBroadcastUrl: { type: String },
        ivsIngestStreamKey: { type: String },
        rejectionReason: { type: String },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date },
        updatedBy: { type: mongoose.Types.ObjectId, refPath: 'createdByModel'},
        publishedBy: { type: mongoose.Types.ObjectId, ref: 'Admin' },
        unpublishedBy: { type: mongoose.Types.ObjectId, ref: 'Admin' },
        rejectedBy: { type: mongoose.Types.ObjectId, ref: 'Admin' },
        startedEventBy: { type: mongoose.Types.ObjectId, ref: 'Admin' },
        endedEventBy: { type: mongoose.Types.ObjectId, ref: 'Admin' },
    },
    { timestamps: true }
);

export default mongoose.model<IEvent>('Event', EventSchema);
