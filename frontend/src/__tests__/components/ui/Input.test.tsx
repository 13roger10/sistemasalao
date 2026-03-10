import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/Input";
import { Search, Mail } from "lucide-react";

describe("Input Component", () => {
  describe("Rendering", () => {
    it("should render input element", () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
    });

    it("should render with label", () => {
      render(<Input label="Email" />);
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    it("should generate id from label", () => {
      render(<Input label="User Name" />);
      const input = screen.getByLabelText("User Name");
      expect(input).toHaveAttribute("id", "user-name");
    });

    it("should use provided id over generated one", () => {
      render(<Input label="Email" id="custom-id" />);
      const input = screen.getByLabelText("Email");
      expect(input).toHaveAttribute("id", "custom-id");
    });
  });

  describe("Error State", () => {
    it("should show error message when error prop is provided", () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText("This field is required")).toBeInTheDocument();
    });

    it("should have error styles when error is present", () => {
      render(<Input error="Error" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("border-red-500");
    });

    it("should show error icon with error message", () => {
      render(<Input error="Error message" />);
      const errorContainer = screen.getByText("Error message").parentElement;
      expect(errorContainer?.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("Hint Text", () => {
    it("should show hint when provided", () => {
      render(<Input hint="Enter your email address" />);
      expect(screen.getByText("Enter your email address")).toBeInTheDocument();
    });

    it("should not show hint when error is present", () => {
      render(<Input hint="Hint text" error="Error text" />);
      expect(screen.queryByText("Hint text")).not.toBeInTheDocument();
      expect(screen.getByText("Error text")).toBeInTheDocument();
    });
  });

  describe("Icons", () => {
    it("should render left icon", () => {
      render(<Input leftIcon={<Search data-testid="left-icon" />} />);
      expect(screen.getByTestId("left-icon")).toBeInTheDocument();
    });

    it("should render right icon", () => {
      render(<Input rightIcon={<Mail data-testid="right-icon" />} />);
      expect(screen.getByTestId("right-icon")).toBeInTheDocument();
    });

    it("should have padding for left icon", () => {
      render(<Input leftIcon={<Search />} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("pl-10");
    });

    it("should have padding for right icon", () => {
      render(<Input rightIcon={<Mail />} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("pr-10");
    });
  });

  describe("Password Toggle", () => {
    it("should show password toggle button for password input", () => {
      render(<Input type="password" showPasswordToggle />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should toggle password visibility on click", async () => {
      const user = userEvent.setup();
      render(<Input type="password" showPasswordToggle label="Password" />);

      const input = screen.getByLabelText("Password") as HTMLInputElement;
      expect(input.type).toBe("password");

      const toggleButton = screen.getByRole("button");
      await user.click(toggleButton);
      expect(input.type).toBe("text");

      await user.click(toggleButton);
      expect(input.type).toBe("password");
    });

    it("should not show password toggle when showPasswordToggle is false", () => {
      render(<Input type="password" />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("should be disabled when disabled prop is true", () => {
      render(<Input disabled />);
      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("should have disabled styles", () => {
      render(<Input disabled />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("disabled:cursor-not-allowed");
    });
  });

  describe("User Input", () => {
    it("should handle text input", async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Hello");

      expect(handleChange).toHaveBeenCalled();
      expect(input).toHaveValue("Hello");
    });

    it("should handle paste", async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole("textbox");
      await user.click(input);
      await user.paste("Pasted text");

      expect(input).toHaveValue("Pasted text");
    });
  });

  describe("Input Types", () => {
    it("should render email input", () => {
      render(<Input type="email" />);
      expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
    });

    it("should render number input", () => {
      render(<Input type="number" />);
      expect(screen.getByRole("spinbutton")).toHaveAttribute("type", "number");
    });

    it("should render tel input", () => {
      render(<Input type="tel" />);
      expect(screen.getByRole("textbox")).toHaveAttribute("type", "tel");
    });
  });

  describe("Custom className", () => {
    it("should merge custom className", () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("custom-class");
    });
  });

  describe("Ref forwarding", () => {
    it("should forward ref to input element", () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Input ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it("should allow focus via ref", () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Input ref={ref} />);
      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });
  });

  describe("Accessibility", () => {
    it("should have proper label association", () => {
      render(<Input label="Username" />);
      const input = screen.getByLabelText("Username");
      expect(input).toBeInTheDocument();
    });

    it("should be focusable", async () => {
      const user = userEvent.setup();
      render(<Input />);
      const input = screen.getByRole("textbox");

      await user.tab();
      expect(input).toHaveFocus();
    });
  });
});
