/**
 * Listed places (Chinese provinces / manufacturing cities, US states in CJK,
 * large US / UK / German cities). Client-safe: the made-in parsers use them
 * after a country, and the cards use them to hide place-naming notes while
 * 製造地 is 未確認.
 */
/** Chinese provinces and major manufacturing cities after a country ("產地：中國（廣東）", "China (Guangdong)"). */
/** US states in CJK ("產地：美國，喬治亞州", "Made in China, 德州"); 州 is allowed after them. */
// Sourced only. 喬治亞州 (cna.com.tw/news/aopl/202601060130.aspx, "美國喬治亞州製造廠"), 德州 (ti.com/zh-tw
// newsroom 2026-01-09, "德州謝爾曼的…製造廠"), 加州 (cna.com.tw/news/aopl/202504240143.aspx, "加州…美國製造產值的中心").
export const US_STATES_CJK = ['喬治亞', '德州', '加州'];
export const CN_PLACES = [...US_STATES_CJK, '江門', '江门', '昆山', '北京', '天津', '上海', '重慶', '重庆', '河北', '山西', '遼寧', '辽宁', '吉林', '黑龍江', '黑龙江', '江蘇', '江苏', '浙江', '安徽', '福建', '江西', '山東', '山东', '河南', '湖北', '湖南', '廣東', '广东', '海南', '四川', '貴州', '贵州', '雲南', '云南', '陝西', '陕西', '甘肅', '甘肃', '青海', '內蒙古', '内蒙古', '廣西', '广西', '西藏', '寧夏', '宁夏', '新疆', '深圳', '廣州', '广州', '東莞', '东莞', '寧波', '宁波', '廈門', '厦门', '蘇州', '苏州', '杭州', '青島', '青岛', '佛山', '中山', '溫州', '温州', '義烏', '义乌'];
export const CN_PLACES_LATIN = ['beijing', 'tianjin', 'shanghai', 'chongqing', 'hebei', 'shanxi', 'liaoning', 'jilin', 'heilongjiang', 'jiangsu', 'zhejiang', 'anhui', 'fujian', 'jiangxi', 'shandong', 'henan', 'hubei', 'hunan', 'guangdong', 'hainan', 'sichuan', 'guizhou', 'yunnan', 'shaanxi', 'gansu', 'qinghai', 'inner mongolia', 'guangxi', 'tibet', 'ningxia', 'xinjiang', 'shenzhen', 'guangzhou', 'dongguan', 'ningbo', 'xiamen', 'suzhou', 'hangzhou', 'qingdao', 'foshan', 'zhongshan', 'wenzhou', 'yiwu', 'jiangmen', 'kunshan'];
/** Large US and UK cities named after a made-in country ("Made in USA, Atlanta, GA", "USA, Cleveland", "Nottingham, made in UK"). */
export const CITY_NAMES = [
  // München / Munich: bmwgroup.com/en/general/imprint.html ("Bayerische Motoren Werke Aktiengesellschaft (Petuelring 130,
  // 80809 München)"; "Domicile and Court of Registry: München HRB 42243").
  'münchen', 'munich', 'new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia', 'san antonio', 'san diego', 'dallas', 'san jose', 'austin', 'jacksonville', 'columbus', 'charlotte', 'indianapolis', 'san francisco', 'seattle', 'denver', 'boston', 'nashville', 'detroit', 'portland', 'las vegas', 'memphis', 'louisville', 'baltimore', 'milwaukee', 'albuquerque', 'tucson', 'fresno', 'sacramento', 'atlanta', 'miami', 'cleveland', 'minneapolis', 'pittsburgh', 'cincinnati', 'kansas city', 'st. louis', 'orlando', 'tampa', 'honolulu', 'brooklyn', 'manhattan', 'chinatown', 'salt lake city', 'oakland', 'raleigh', 'omaha', 'tulsa', 'thousand oaks',
  // UK cities ("Nottingham, made in UK")
  // Bayreuth (CYBEX GmbH, mycbx.com/en-en/imprint: "Riedingerstr. 18 95448 Bayreuth Germany").
  // Kulmbach (CYBEX's first seat): online-handelsregister.de HRB 3792 Bayreuth, Firmen-Historie
  // "Columbus Trading-Partners GmbH (Kulmbach)". frankenpost.de 2020-03-14 (Hauptfirmensitz Kulmbach);
  // kurier.de 2016-12-16 ("gründete … in Kulmbach, … zog es Cybex nach Bayreuth").
  'bayreuth',
  'kulmbach',
  'london', 'manchester', 'birmingham', 'nottingham', 'leeds', 'glasgow', 'edinburgh', 'bristol', 'liverpool', 'sheffield', 'leicester', 'belfast', 'cardiff', 'newcastle'];
