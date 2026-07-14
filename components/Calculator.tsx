import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { getCalcHistory, addCalcEntry, CalcEntry } from "../lib/calculator-history";

type Operation = "+" | "-" | "×" | "÷" | null;

interface ButtonProps {
  label: string;
  wide?: boolean;
  accent?: boolean;
  dim?: boolean;
  onPress: () => void;
}

const Button = ({
  label,
  wide,
  accent,
  dim,
  onPress,
}: ButtonProps) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className={`${
      wide ? "w-[148px]" : "w-[68px]"
    } h-[68px] rounded-full items-center justify-center ${
      accent ? "bg-accent" : dim ? "bg-bg-elevated" : "bg-bg-card"
    }`}
  >
    <Text
      className={`text-2xl font-medium ${
        accent ? "text-white" : dim ? "text-muted" : "text-white"
      }`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export function Calculator({ showHistory = false }: { showHistory?: boolean }) {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<Operation>(null);
  const [fresh, setFresh] = useState(true);
  const [history, setHistory] = useState<CalcEntry[]>([]);

  useEffect(() => {
    getCalcHistory().then(setHistory);
  }, []);

  const inputDigit = (d: string) => {
    if (fresh) {
      setDisplay(d);
      setFresh(false);
    } else {
      setDisplay(display === "0" ? d : display + d);
    }
  };

  const inputDot = () => {
    if (fresh) {
      setDisplay("0.");
      setFresh(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const clear = () => {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setFresh(true);
  };

  const toggleSign = () => {
    setDisplay(display.charAt(0) === "-" ? display.slice(1) : "-" + display);
  };

  const percent = () => {
    setDisplay(String(parseFloat(display) / 100));
  };

  const performOp = (nextOp: Operation) => {
    const current = parseFloat(display);
    if (prev !== null && op) {
      let result: number;
      switch (op) {
        case "+": result = prev + current; break;
        case "-": result = prev - current; break;
        case "×": result = prev * current; break;
        case "÷": result = current !== 0 ? prev / current : 0; break;
        default: result = current;
      }
      setDisplay(String(result));
      setPrev(result);
    } else {
      setPrev(current);
    }
    setOp(nextOp);
    setFresh(true);
  };

  const equals = () => {
    if (prev === null || !op) return;
    const current = parseFloat(display);
    let result: number;
    switch (op) {
      case "+": result = prev + current; break;
      case "-": result = prev - current; break;
      case "×": result = prev * current; break;
      case "÷": result = current !== 0 ? prev / current : 0; break;
      default: result = current;
    }

    const expression = `${prev} ${op} ${display}`;
    const resultStr = String(result);
    addCalcEntry(expression, resultStr).then(() => {
      getCalcHistory().then(setHistory);
    });

    setDisplay(resultStr);
    setPrev(null);
    setOp(null);
    setFresh(true);
  };

  return (
    <View className="flex-1 bg-bg px-5 pt-16 pb-8 justify-end">
      {/* Fake history */}
      {showHistory && history.length > 0 && (
        <ScrollView
          className="mb-4"
          style={{ maxHeight: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {history.slice(0, 5).map((entry, i) => (
            <TouchableOpacity
              key={`${entry.timestamp}-${i}`}
              activeOpacity={0.7}
              onPress={() => setDisplay(entry.result)}
              className="items-end py-1"
            >
              <Text className="text-muted text-xs">{entry.expression}</Text>
              <Text className="text-muted/60 text-lg">= {entry.result}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View className="items-end mb-6">
        <Text
          className="text-white font-light"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.3}
          style={{ fontSize: display.length > 9 ? 48 : 72 }}
        >
          {display}
        </Text>
      </View>

      <View className="gap-3">
        <View className="flex-row justify-between">
          <Button label="AC" dim onPress={clear} />
          <Button label="±" dim onPress={toggleSign} />
          <Button label="%" dim onPress={percent} />
          <Button label="÷" accent onPress={() => performOp("÷")} />
        </View>
        <View className="flex-row justify-between">
          <Button label="7" onPress={() => inputDigit("7")} />
          <Button label="8" onPress={() => inputDigit("8")} />
          <Button label="9" onPress={() => inputDigit("9")} />
          <Button label="×" accent onPress={() => performOp("×")} />
        </View>
        <View className="flex-row justify-between">
          <Button label="4" onPress={() => inputDigit("4")} />
          <Button label="5" onPress={() => inputDigit("5")} />
          <Button label="6" onPress={() => inputDigit("6")} />
          <Button label="-" accent onPress={() => performOp("-")} />
        </View>
        <View className="flex-row justify-between">
          <Button label="1" onPress={() => inputDigit("1")} />
          <Button label="2" onPress={() => inputDigit("2")} />
          <Button label="3" onPress={() => inputDigit("3")} />
          <Button label="+" accent onPress={() => performOp("+")} />
        </View>
        <View className="flex-row justify-between">
          <Button label="0" wide onPress={() => inputDigit("0")} />
          <Button label="." onPress={inputDot} />
          <Button label="=" accent onPress={equals} />
        </View>
      </View>
    </View>
  );
}
