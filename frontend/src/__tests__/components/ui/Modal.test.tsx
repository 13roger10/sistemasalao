import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal, ConfirmModal, AlertModal } from "@/components/ui/Modal";

describe("Modal Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render when isOpen is true", () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByText("Modal content")).toBeInTheDocument();
    });

    it("should not render when isOpen is false", () => {
      render(<Modal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Modal content")).not.toBeInTheDocument();
    });

    it("should render title when provided", () => {
      render(<Modal {...defaultProps} title="Modal Title" />);
      expect(screen.getByText("Modal Title")).toBeInTheDocument();
    });

    it("should render description when provided", () => {
      render(<Modal {...defaultProps} description="Modal description" />);
      expect(screen.getByText("Modal description")).toBeInTheDocument();
    });

    it("should render footer when provided", () => {
      render(
        <Modal {...defaultProps} footer={<button>Footer Button</button>} />
      );
      expect(screen.getByText("Footer Button")).toBeInTheDocument();
    });
  });

  describe("Close Button", () => {
    it("should show close button by default", () => {
      render(<Modal {...defaultProps} title="Title" />);
      expect(screen.getByLabelText("Fechar modal")).toBeInTheDocument();
    });

    it("should hide close button when showCloseButton is false", () => {
      render(<Modal {...defaultProps} showCloseButton={false} />);
      expect(screen.queryByLabelText("Fechar modal")).not.toBeInTheDocument();
    });

    it("should call onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<Modal {...defaultProps} title="Title" onClose={onClose} />);

      await user.click(screen.getByLabelText("Fechar modal"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Overlay Click", () => {
    it("should close on overlay click by default", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      // Click on the backdrop
      const backdrop = document.querySelector('[aria-hidden="true"]');
      if (backdrop) {
        await user.click(backdrop);
      }
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should not close on overlay click when closeOnOverlayClick is false", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(
        <Modal {...defaultProps} onClose={onClose} closeOnOverlayClick={false} />
      );

      const backdrop = document.querySelector('[aria-hidden="true"]');
      if (backdrop) {
        await user.click(backdrop);
      }
      expect(onClose).not.toHaveBeenCalled();
    });

    it("should not close when clicking inside modal content", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByText("Modal content"));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("Escape Key", () => {
    it("should close on Escape key by default", () => {
      const onClose = jest.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should not close on Escape when closeOnEscape is false", () => {
      const onClose = jest.fn();
      render(<Modal {...defaultProps} onClose={onClose} closeOnEscape={false} />);

      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("Sizes", () => {
    it.each(["sm", "md", "lg", "xl", "full"] as const)(
      "should render with size %s",
      (size) => {
        render(<Modal {...defaultProps} size={size} />);
        const modal = screen.getByRole("dialog");
        expect(modal).toBeInTheDocument();
      }
    );
  });

  describe("Body Scroll Lock", () => {
    it("should lock body scroll when open", () => {
      render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("should restore body scroll when closed", () => {
      const { rerender } = render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe("hidden");

      rerender(<Modal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe("");
    });

    it("should restore body scroll on unmount", () => {
      const { unmount } = render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe("hidden");

      unmount();
      expect(document.body.style.overflow).toBe("");
    });
  });

  describe("Accessibility", () => {
    it("should have role dialog", () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should have aria-modal attribute", () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("should have aria-labelledby when title is provided", () => {
      render(<Modal {...defaultProps} title="Test Title" />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby", "modal-title");
    });

    it("should have aria-describedby when description is provided", () => {
      render(<Modal {...defaultProps} description="Test description" />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-describedby", "modal-description");
    });
  });
});

describe("ConfirmModal Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    title: "Confirm Action",
    message: "Are you sure?",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render title and message", () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText("Confirm Action")).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("should render default button text", () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText("Confirmar")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });

  it("should render custom button text", () => {
    render(
      <ConfirmModal
        {...defaultProps}
        confirmText="Yes, delete"
        cancelText="No, keep it"
      />
    );
    expect(screen.getByText("Yes, delete")).toBeInTheDocument();
    expect(screen.getByText("No, keep it")).toBeInTheDocument();
  });

  it("should call onConfirm when confirm button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByText("Confirmar"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<ConfirmModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should show loading state", () => {
    render(<ConfirmModal {...defaultProps} isLoading />);
    expect(screen.getByText("Cancelar")).toBeDisabled();
  });

  it("should use danger variant for confirm button", () => {
    render(<ConfirmModal {...defaultProps} variant="danger" />);
    const confirmButton = screen.getByText("Confirmar").closest("button");
    expect(confirmButton).toHaveClass("bg-red-500");
  });
});

describe("AlertModal Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: "Alert Title",
    message: "Alert message",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render title and message", () => {
    render(<AlertModal {...defaultProps} />);
    expect(screen.getByText("Alert Title")).toBeInTheDocument();
    expect(screen.getByText("Alert message")).toBeInTheDocument();
  });

  it("should render default button text", () => {
    render(<AlertModal {...defaultProps} />);
    expect(screen.getByText("OK")).toBeInTheDocument();
  });

  it("should render custom button text", () => {
    render(<AlertModal {...defaultProps} buttonText="Got it" />);
    expect(screen.getByText("Got it")).toBeInTheDocument();
  });

  it("should call onClose when button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<AlertModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByText("OK"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each(["info", "success", "warning", "error"] as const)(
    "should render %s variant",
    (variant) => {
      render(<AlertModal {...defaultProps} variant={variant} />);
      expect(screen.getByText("Alert Title")).toBeInTheDocument();
    }
  );
});
