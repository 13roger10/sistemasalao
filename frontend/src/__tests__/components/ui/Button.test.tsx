import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/Button";
import { Search } from "lucide-react";

describe("Button Component", () => {
  describe("Rendering", () => {
    it("should render with children text", () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
    });

    it("should render with default variant (primary)", () => {
      render(<Button>Primary Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-violet-500");
    });

    it("should render with secondary variant", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-gray-100");
    });

    it("should render with outline variant", () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("border-violet-500");
    });

    it("should render with ghost variant", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("text-gray-600");
    });

    it("should render with danger variant", () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-red-500");
    });
  });

  describe("Sizes", () => {
    it("should render with small size", () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-3", "py-1.5", "text-sm");
    });

    it("should render with medium size (default)", () => {
      render(<Button size="md">Medium</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-4", "py-2", "text-base");
    });

    it("should render with large size", () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-6", "py-3", "text-lg");
    });
  });

  describe("Loading State", () => {
    it("should show loading spinner when isLoading is true", () => {
      render(<Button isLoading>Loading</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button.querySelector("svg")).toBeInTheDocument();
    });

    it("should be disabled when isLoading is true", () => {
      render(<Button isLoading>Loading</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should hide left icon when loading", () => {
      render(
        <Button isLoading leftIcon={<Search data-testid="search-icon" />}>
          Search
        </Button>
      );
      expect(screen.queryByTestId("search-icon")).not.toBeInTheDocument();
    });
  });

  describe("Icons", () => {
    it("should render with left icon", () => {
      render(
        <Button leftIcon={<Search data-testid="left-icon" />}>
          With Icon
        </Button>
      );
      expect(screen.getByTestId("left-icon")).toBeInTheDocument();
    });

    it("should render with right icon", () => {
      render(
        <Button rightIcon={<Search data-testid="right-icon" />}>
          With Icon
        </Button>
      );
      expect(screen.getByTestId("right-icon")).toBeInTheDocument();
    });

    it("should render with both icons", () => {
      render(
        <Button
          leftIcon={<Search data-testid="left-icon" />}
          rightIcon={<Search data-testid="right-icon" />}
        >
          Both Icons
        </Button>
      );
      expect(screen.getByTestId("left-icon")).toBeInTheDocument();
      expect(screen.getByTestId("right-icon")).toBeInTheDocument();
    });
  });

  describe("Full Width", () => {
    it("should render full width when fullWidth is true", () => {
      render(<Button fullWidth>Full Width</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("w-full");
    });
  });

  describe("Disabled State", () => {
    it("should be disabled when disabled prop is true", () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should have disabled styles when disabled", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("disabled:opacity-50");
    });
  });

  describe("Click Events", () => {
    it("should call onClick when clicked", () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should not call onClick when disabled", () => {
      const handleClick = jest.fn();
      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );
      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("should not call onClick when loading", () => {
      const handleClick = jest.fn();
      render(
        <Button onClick={handleClick} isLoading>
          Loading
        </Button>
      );
      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("Custom className", () => {
    it("should merge custom className", () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });
  });

  describe("Ref forwarding", () => {
    it("should forward ref to button element", () => {
      const ref = { current: null as HTMLButtonElement | null };
      render(<Button ref={ref}>With Ref</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });
});
