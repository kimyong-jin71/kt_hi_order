import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";

const config = {
  // 메뉴판 단가
  price_menu10_3year: 7000,
  price_menu10_2year: 9000,
  price_menu10_lumpsum: 3600000,

  price_menu15_3year: 9000,
  price_menu15_2year: 11000,
  price_menu15_lumpsum: 4800000,

  // 알림판 단가
  price_display10_3year: 7000,
  price_display10_2year: 9000,
  price_display10_lumpsum: 3600000,

  price_display15_3year: 9000,
  price_display15_2year: 11000,
  price_display15_lumpsum: 4800000,

  // 기타 고정값 (서비스 요금 세대별)
  price_cardreader: 2000,
  price_service_gen1: 12000, // 하이오더 1세대
  price_service_gen2: 13000  // 하이오더 2세대
};

export default function HighOrderCalculator() {
  const [formData, setFormData] = useState({
    paymentType: "postpaid", // 기본값을 "postpaid"로 설정
    menu10: 0,
    menu15: 0,
    display10: 0,
    display15: 0,
    cardReader: 0,
    discountOption: "none",
    contractPeriod: "3year", // "3year", "2year", "lumpsum"
    serviceGen: "gen1"      // "gen1"(기본) 또는 "gen2"
  });

  const [result, setResult] = useState(null);
  const [monthlyOnly, setMonthlyOnly] = useState(null);
  const [lumpsumOnly, setLumpsumOnly] = useState(null);
  const [includeVAT, setIncludeVAT] = useState(false);
  const [prepaidAmount, setPrepaidAmount] = useState(0);

  // paymentType="prepaid"일 때 메뉴판 합을 카드리더기 기본값으로 설정
  useEffect(() => {
    if (formData.paymentType === "prepaid") {
      const defaultCardReader = formData.menu10 + formData.menu15;
      setFormData((prev) => ({ ...prev, cardReader: defaultCardReader }));
    }
  }, [formData.paymentType, formData.menu10, formData.menu15]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ["menu10", "menu15", "display10", "display15", "cardReader"];
    setFormData((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value
    }));
  };

  const handleCalculate = () => {
    const contract = formData.contractPeriod; // "3year", "2year", "lumpsum"

    // 메뉴판/알림판 가격 계산
    const menu10Price = formData.menu10 * (config[`price_menu10_${contract}`] || 0);
    const menu15Price = formData.menu15 * (config[`price_menu15_${contract}`] || 0);
    const display10Price = formData.display10 * (config[`price_display10_${contract}`] || 0);
    const display15Price = formData.display15 * (config[`price_display15_${contract}`] || 0);

    // 카드리더기 가격 (선불형에만 적용)
    const cardReaderPrice = formData.paymentType === "prepaid"
      ? formData.cardReader * (config.price_cardreader || 0)
      : 0;

    // 서비스 요금 (선택된 세대에 따라)
    const serviceFee = config[`price_service_${formData.serviceGen}`] || 0;

    let totalPrice = 0;
    let monthlyPrice = 0;
    let lumpsumPrice = 0;

    if (contract === "lumpsum") {
      // 일시불 분기
      lumpsumPrice = menu10Price + menu15Price + display10Price + display15Price;
      monthlyPrice = cardReaderPrice + serviceFee;
      if (includeVAT) {
        lumpsumPrice = Math.round(lumpsumPrice * 1.1);
        monthlyPrice = Math.round(monthlyPrice * 1.1);
      }
      setLumpsumOnly(lumpsumPrice);
      setMonthlyOnly(monthlyPrice);
      totalPrice = lumpsumPrice + monthlyPrice;
      setResult(totalPrice);
    } else {
      // 약정형(3년/2년) 분기
      totalPrice = menu10Price + menu15Price + display10Price + display15Price + cardReaderPrice + serviceFee;
      totalPrice -= prepaidAmount;
      if (includeVAT) {
        totalPrice = Math.round(totalPrice * 1.1);
      }
      setResult(totalPrice);
      setLumpsumOnly(null);
      setMonthlyOnly(null);
    }

    // 엑셀 저장 로직
    const excelData = [{
      paymentType: formData.paymentType,
      menu10: formData.menu10,
      menu15: formData.menu15,
      display10: formData.display10,
      display15: formData.display15,
      cardReader: formData.cardReader,
      contractPeriod: formData.contractPeriod,
      prepaidAmount,
      discountOption: formData.discountOption,
      serviceGen: formData.serviceGen,
      includeVAT: includeVAT ? "포함" : "미포함",
      result: contract === "lumpsum"
        ? `일시불 총액: ${lumpsumPrice}, 월 요금: ${monthlyPrice}`
        : totalPrice
    }];

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const headerNames = [
      "결제방법", "메뉴판_10인치", "메뉴판_15인치",
      "알림판_10인치", "알림판_15인치", "카드리더기",
      "약정기간", "선납입금", "할인", "서비스세대",
      "부가세포함", "예상요금"
    ];
    headerNames.forEach((title, idx) => {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c: idx });
      worksheet[cellAddr].v = title;
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "계산결과");
    XLSX.writeFile(workbook, "KT_하이오더_계산결과.xlsx");
  };

  // 동적 라벨 계산
  const menu10LabelPrice = config[`price_menu10_${formData.contractPeriod}`] || 0;
  const menu15LabelPrice = config[`price_menu15_${formData.contractPeriod}`] || 0;
  const display10LabelPrice = config[`price_display10_${formData.contractPeriod}`] || 0;
  const display15LabelPrice = config[`price_display15_${formData.contractPeriod}`] || 0;

  // 현재 선택된 서비스 요금 라벨(1세대 or 2세대)
  const serviceLabelPrice = config[`price_service_${formData.serviceGen}`] || 0;

  return (
    <div className="max-w-xl mx-auto p-4 bg-white shadow rounded-xl">
      <h2 className="text-xl font-bold mb-4 text-center">KT 하이오더 계산기</h2>
      <div className="grid gap-4">
        {/* 하이오더 서비스 세대 선택 */}
        <div>
          <label className="block text-sm font-medium">하이오더 서비스 세대</label>
          <select
            name="serviceGen"
            className="w-full border rounded p-2"
            value={formData.serviceGen}
            onChange={handleChange}
          >
            <option value="gen1">1세대 ({config.price_service_gen1.toLocaleString()}원)</option>
            <option value="gen2">2세대 ({config.price_service_gen2.toLocaleString()}원)</option>
          </select>
        </div>

        {/* 결제 방법 (기본 후불형) */}
        <div>
          <label className="block text-sm font-medium">결제 방법</label>
          <select
            name="paymentType"
            className="w-full border rounded p-2"
            value={formData.paymentType}
            onChange={handleChange}
          >
            <option value="postpaid">후불형 (카운터 계산)</option>
            <option value="prepaid">선불형 (테이블 계산)</option>
          </select>
        </div>

        {/* 메뉴판 수 */}
        <div className="border rounded p-3">
          <h3 className="text-sm font-bold mb-2">메뉴판 수</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm">
                10인치 ({menu10LabelPrice.toLocaleString()}원)
              </label>
              <input
                type="number"
                name="menu10"
                className="w-full border rounded p-2"
                min={0}
                value={formData.menu10}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm">
                15인치 ({menu15LabelPrice.toLocaleString()}원)
              </label>
              <input
                type="number"
                name="menu15"
                className="w-full border rounded p-2"
                min={0}
                value={formData.menu15}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* 알림판 수 */}
        <div className="border rounded p-3">
          <h3 className="text-sm font-bold mb-2">알림판 수</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm">
                10인치 ({display10LabelPrice.toLocaleString()}원)
              </label>
              <input
                type="number"
                name="display10"
                className="w-full border rounded p-2"
                min={0}
                value={formData.display10}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm">
                15인치 ({display15LabelPrice.toLocaleString()}원)
              </label>
              <input
                type="number"
                name="display15"
                className="w-full border rounded p-2"
                min={0}
                value={formData.display15}
                onChange={handleChange}
              />
            </div>
          </div>
          {formData.paymentType === "prepaid" && (
            <div className="mt-4">
              <label className="block text-sm">카드 리더기 수</label>
              <input
                type="number"
                name="cardReader"
                className="w-full border rounded p-2"
                min={0}
                value={formData.cardReader}
                onChange={handleChange}
              />
            </div>
          )}
        </div>

        {/* 총 단말 수 */}
        <div>
          <label className="block text-sm font-medium">총 단말 수</label>
          <input
            type="number"
            className="w-full border rounded p-2 bg-gray-100"
            readOnly
            value={
              formData.menu10 +
              formData.menu15 +
              formData.display10 +
              formData.display15
            }
          />
        </div>

        {/* 약정 기간 */}
        <div>
          <label className="block text-sm font-medium">약정기간</label>
          <select
            name="contractPeriod"
            className="w-full border rounded p-2"
            value={formData.contractPeriod}
            onChange={handleChange}
          >
            <option value="3year">3년</option>
            <option value="2year">2년</option>
            <option value="lumpsum">일시불</option>
          </select>
        </div>

        {/* 선납 입금 */}
        <div>
          <label className="block text-sm font-medium mb-1">선납 입금</label>
          <div className="flex items-center gap-4">
            <input
              type="text"
              name="prepaidAmount"
              className="border rounded p-2 w-1/2"
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                const num = Number(raw) || 0;
                setPrepaidAmount(num);
              }}
              value={prepaidAmount.toLocaleString()}
            />
            <div className="text-right w-1/2">
              <span className="text-sm text-gray-600">
                입력값: {prepaidAmount.toLocaleString()} 원
              </span>
            </div>
          </div>
        </div>

        {/* 할인 */}
        <div>
          <label className="block text-sm font-medium">할인</label>
          <select
            name="discountOption"
            className="w-full border rounded p-2"
            value={formData.discountOption}
            onChange={handleChange}
          >
            <option value="none">없음</option>
            <option value="ktfamily">KT 결합할인</option>
            <option value="longterm">장기고객 할인</option>
          </select>
        </div>

        {/* 부가세 포함 여부 */}
        <div>
          <label className="block text-sm font-medium">부가세 포함 여부</label>
          <select
            className="w-full border rounded p-2"
            value={includeVAT ? "include" : "exclude"}
            onChange={(e) => setIncludeVAT(e.target.value === "include")}
          >
            <option value="exclude">부가세 미포함</option>
            <option value="include">부가세 포함</option>
          </select>
        </div>

        {/* 계산하기 버튼 */}
        <button
          onClick={handleCalculate}
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          계산하기
        </button>

        {/* 결과 표시 */}
        {formData.contractPeriod === "lumpsum" ? (
          <>
            <div className="mt-4 text-lg font-semibold">
              일시불 총액: {lumpsumOnly != null ? lumpsumOnly.toLocaleString() : ""}원
            </div>
            <div className="text-lg font-semibold">
              월 예상 요금: {monthlyOnly != null ? monthlyOnly.toLocaleString() : ""}원
            </div>
          </>
        ) : (
          result != null && (
            <div className="mt-4 text-lg font-semibold">
              예상 요금: {result.toLocaleString()}원
            </div>
          )
        )}
      </div>
    </div>
  );
}
